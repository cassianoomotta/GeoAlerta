import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {PrismaClient} from '../../../prisma/generated/client/client';
import {PrismaPg} from '@prisma/adapter-pg';
import type {PublicOccurrenceInput,OpenResult} from '@/features/occurrences/contracts';
export class IntakeError extends Error {
  constructor(public status:409|429,public code:string){super(code);}
}
const cached=globalThis as unknown as {intakePrisma?:PrismaClient};
function client(){
  if(cached.intakePrisma)return cached.intakePrisma;
  if(!process.env.INGEST_DATABASE_URL)throw new Error('Restricted ingestion connection unavailable.');
  return cached.intakePrisma=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.INGEST_DATABASE_URL})});
}
export async function openOccurrence(input:PublicOccurrenceInput,key:string,origin:string):Promise<{result:OpenResult;replay:boolean}>{
  const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
  return client().$transaction(async tx=>{
    const roles=await tx.$queryRaw<{safe:boolean}[]>`SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT login.rolsuper AND NOT login.rolbypassrls AND r.rolname='geoalerta_ingest' AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relowner IN(r.oid,login.oid)) AS safe FROM pg_roles r JOIN pg_roles login ON login.rolname=session_user WHERE r.rolname=current_user`;
    if(!roles[0]?.safe)throw new Error('Unsafe ingestion connection.');
    const id=randomUUID(),eventId=randomUUID();
    await tx.$queryRaw`SELECT set_config('core.attempt_key',${key},true),set_config('core.attempt_id',${id},true),set_config('core.origin_hash',${origin},true)`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},0))`;
    const existing=await tx.$queryRaw<{request_hash:string;response:OpenResult}[]>`SELECT request_hash,response FROM public.idempotency_keys WHERE key=${key}`;
    if(existing[0]){
      if(existing[0].request_hash!==hash)throw new IntakeError(409,'IDEMPOTENCY_CONFLICT');
      return {result:existing[0].response,replay:true};
    }
    const allowed=await tx.$queryRaw<{attempts:number}[]>`INSERT INTO public.intake_rate_limits(origin_hash,minute,attempts) VALUES(${origin},date_trunc('minute',transaction_timestamp()),1) ON CONFLICT(origin_hash,minute) DO UPDATE SET attempts=intake_rate_limits.attempts+1 WHERE intake_rate_limits.attempts<20 RETURNING attempts`;
    if(!allowed.length)throw new IntakeError(429,'RATE_LIMITED');
    const groups=await tx.$queryRaw<{id:string}[]>`SELECT id FROM public.groups WHERE is_default AND municipality_id='sa_patrulha'`;
    if(groups.length!==1)throw new Error('Default group unavailable.');
    const zones=await tx.$queryRaw<{zone_id:string;version:number}[]>`SELECT zone_id,version FROM public.risk_zones WHERE active AND (valid_from IS NULL OR valid_from<=transaction_timestamp()) AND (valid_to IS NULL OR valid_to>transaction_timestamp()) AND ST_Intersects(geometry,ST_SetSRID(ST_MakePoint(${input.position.longitude},${input.position.latitude}),4326))`;
    const priority=zones.length?'ALTA':'NORMAL';
    const result:OpenResult={id,protocol:`GA-${id}`,status:'NOVA',priority,version:1};
    await tx.$executeRaw`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,status,priority,group_id) VALUES(${id}::uuid,${result.protocol},${input.type},${input.description},ST_SetSRID(ST_MakePoint(${input.position.longitude},${input.position.latitude}),4326)::geography,${input.position.accuracy},'NOVA',${priority},${groups[0].id}::uuid)`;
    await tx.$executeRaw`INSERT INTO public.occurrence_private_data(occurrence_id,reporter_name,reporter_contact) VALUES(${id}::uuid,${input.reporterName},${input.reporterContact})`;
    for(const zone of zones)await tx.$executeRaw`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES(${id}::uuid,${zone.zone_id}::uuid,${zone.version})`;
    await tx.$executeRaw`INSERT INTO public.occurrence_events(id,occurrence_id,kind) VALUES(${eventId}::uuid,${id}::uuid,'OPENED')`;
    await tx.$executeRaw`INSERT INTO public.audit_events(entity_id,kind) VALUES(${id}::uuid,'OPENED')`;
    await tx.$executeRaw`INSERT INTO public.occurrence_alerts(event_id,occurrence_id,group_id,priority,status) VALUES(${eventId}::uuid,${id}::uuid,${groups[0].id}::uuid,${priority},'NOVA')`;
    await tx.$executeRaw`INSERT INTO public.idempotency_keys(key,request_hash,occurrence_id,response) VALUES(${key},${hash},${id}::uuid,${JSON.stringify(result)}::jsonb)`;
    return {result,replay:false};
  },{timeout:15000,maxWait:15000});
}
