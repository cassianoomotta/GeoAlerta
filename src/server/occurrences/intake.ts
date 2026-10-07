import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {PrismaClient} from '../../../prisma/generated/client/client';
import {PrismaPg} from '@prisma/adapter-pg';
import type {PublicOccurrenceInput,OpenResult} from '@/features/occurrences/contracts';
import type {PublicShelter} from '@/features/shelters/contracts';
import {classifyOccurrence,persistOccurrence} from './persist';
import {resolvePhotoToken} from '@/features/occurrences/photos/token';
import {photoSecret} from '@/server/photos/storage';
import {PublicInputError} from '@/features/occurrences/public-input';
import {resolveActiveClimateEvent} from '@/server/climate-events/intake';
export class IntakeError extends Error {
  constructor(public status:409|429,public code:string){super(code);}
}
const cached=globalThis as unknown as {intakePrisma?:PrismaClient};
function client(){
  if(cached.intakePrisma)return cached.intakePrisma;
  if(!process.env.INGEST_DATABASE_URL)throw new Error('Restricted ingestion connection unavailable.');
  return cached.intakePrisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.INGEST_DATABASE_URL})});
}
export async function listActiveOccurrenceTypes():Promise<string[]>{
  const rows=await client().$queryRaw<{name:string}[]>`SELECT name FROM public.occurrence_types WHERE active ORDER BY display_order,name`;
  return rows.map(({name})=>name);
}
export async function listOpenShelters():Promise<PublicShelter[]>{
  const rows=await client().$queryRaw<{id:string;name:string;type:string;address:string;lat:number;lng:number;status:'Aberto'}[]>`
    SELECT id::text,name,type,address,lat,lng,status
    FROM public.shelters
    WHERE municipio='sa_patrulha' AND is_active AND status='Aberto'
      AND address IS NOT NULL AND btrim(address)<>''
      AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
    ORDER BY name,id
  `;
  return rows.map(row=>({...row,type:row.type as PublicShelter['type']}));
}
export async function openOccurrence(input:PublicOccurrenceInput,key:string,origin:string):Promise<{result:OpenResult;replay:boolean}>{
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return client().$transaction(async tx=>{
    const roles=await tx.$queryRaw<{safe:boolean}[]>`SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT login.rolsuper AND NOT login.rolbypassrls AND r.rolname='geoalerta_ingest' AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner IN(r.oid,login.oid)) AS safe FROM pg_roles r JOIN pg_roles login ON login.rolname=session_user WHERE r.rolname=current_user`;
    if(!roles[0]?.safe)throw new Error('Unsafe ingestion connection.');
    const id=randomUUID();
    await tx.$queryRaw`SELECT set_config('core.attempt_key',${key},true),set_config('core.attempt_id',${id},true),set_config('core.origin_hash',${origin},true)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
    const existing=await tx.$queryRaw<{request_hash:string;response:OpenResult}[]>`SELECT request_hash,response FROM public.idempotency_keys WHERE key=${key}`;
    if(existing[0]){
      if(existing[0].request_hash!==hash)throw new IntakeError(409,'IDEMPOTENCY_CONFLICT');
      return {result:existing[0].response,replay:true};
    }
    const activeType=await tx.$queryRaw<{name:string}[]>`SELECT name FROM public.occurrence_types WHERE name=${input.type} AND active`;
    if(!activeType.length)throw new PublicInputError();
    // Replay precedes expiry validation; the same confirmed request stays replayable.
    const photoObjectKey=input.photoToken?resolvePhotoToken(input.photoToken,key,photoSecret()):null;
    const allowed=await tx.$queryRaw<{attempts:number}[]>`INSERT INTO public.intake_rate_limits(origin_hash,minute,attempts) VALUES(${origin},date_trunc('minute',transaction_timestamp()),1) ON CONFLICT(origin_hash,minute) DO UPDATE SET attempts=intake_rate_limits.attempts+1 WHERE intake_rate_limits.attempts<20 RETURNING attempts`;
    if(!allowed.length)throw new IntakeError(429,'RATE_LIMITED');
    const groups=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.groups WHERE is_default AND municipality_id='sa_patrulha'`;
    if(groups.length!==1)throw new Error('Default group unavailable.');
    const climateEventId=await resolveActiveClimateEvent(tx,'sa_patrulha');
    const classification=await classifyOccurrence(tx,input.position);
    const result:OpenResult=await persistOccurrence(tx,{
      input,
      groupId:groups[0].id,
      idempotencyKey:key,
      requestHash:hash,
      classification,
      climateEventId,
      actorId:null,
      occurrenceId:id,
      photoObjectKey,
    });
    return {result,replay:false};
  },{timeout:15000,maxWait:15000});
}
export async function reservePhotoUpload(key:string,origin:string):Promise<void>{
  await client().$transaction(async tx=>{
    const roles=await tx.$queryRaw<{safe:boolean}[]>`SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT login.rolsuper AND NOT login.rolbypassrls AND r.rolname='geoalerta_ingest' AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner IN(r.oid,login.oid)) AS safe FROM pg_roles r JOIN pg_roles login ON login.rolname=session_user WHERE r.rolname=current_user`;
    if(!roles[0]?.safe)throw new Error('Unsafe ingestion connection.');
    const photoOrigin=`photo:${origin}`;
    await tx.$queryRaw`SELECT set_config('core.attempt_key',${key},true),set_config('core.origin_hash',${photoOrigin},true)`;
    const existing=await tx.$queryRaw<{key:string}[]>`SELECT key FROM public.idempotency_keys WHERE key=${key}`;
    if(existing.length)throw new IntakeError(409,'IDEMPOTENCY_CONFLICT');
    const allowed=await tx.$queryRaw<{attempts:number}[]>`INSERT INTO public.intake_rate_limits(origin_hash,minute,attempts) VALUES(${photoOrigin},date_trunc('minute',transaction_timestamp()),1) ON CONFLICT(origin_hash,minute) DO UPDATE SET attempts=intake_rate_limits.attempts+1 WHERE intake_rate_limits.attempts<20 RETURNING attempts`;
    if(!allowed.length)throw new IntakeError(429,'RATE_LIMITED');
  });
}
