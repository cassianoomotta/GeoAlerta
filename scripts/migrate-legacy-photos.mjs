// One-time, resumable preservation of deployed legacy evidence. No files or
// credentials are printed; original Storage objects and SQL references remain.
import {loadLocalEnv} from './with-env.mjs';
import {createClient} from '@supabase/supabase-js';
import {createHash,randomUUID} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import pg from 'pg';
loadLocalEnv();
const project='fwqbwqxgajnrjwccdebh';
if(process.env.CORE_LEGACY_PHOTOS_CONFIRM_PROJECT!==project)throw new Error('PROJECT_CONFIRMATION_REQUIRED');
if(process.env.NEXT_PUBLIC_SUPABASE_URL!==`https://${project}.supabase.co`)throw new Error('UNEXPECTED_STORAGE_PROJECT');
const url=new URL(process.env.CORE_ADMIN_DATABASE_URL);
if(url.hostname!=='aws-0-sa-east-1.pooler.supabase.com'||url.username!==`postgres.${project}`||url.port!=='5432')throw new Error('UNEXPECTED_DATABASE_PROJECT');
const storage=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const db=new pg.Client({connectionString:url.toString()});
const prefix=`https://${project}.supabase.co/storage/v1/object/public/occurrence_photos/`;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
try{
 await db.connect();
 const rows=(await db.query('SELECT o.id,o.photo_url,p.photo_object_key FROM public.occurrences o JOIN public.occurrence_private_data p ON p.occurrence_id=o.id WHERE o.photo_url IS NOT NULL ORDER BY o.id')).rows;
 if(rows.some(row=>!row.photo_url.startsWith(prefix)))throw new Error('NON_PROJECT_LEGACY_REFERENCE');
 const bucket=await storage.storage.getBucket('core-occurrence-evidence');
 if(bucket.error||bucket.data.public)throw new Error('PRIVATE_CORE_BUCKET_REQUIRED');
 let copied=0,alreadyVerified=0,bytesVerified=0;
 for(const row of rows){
   const original=decodeURIComponent(row.photo_url.slice(prefix.length));
   if(!original||original.includes('..')||original.includes('?')||original.includes('#'))throw new Error('INVALID_LEGACY_PATH');
   const source=await storage.storage.from('occurrence_photos').download(original);
   if(source.error||!source.data)throw new Error('LEGACY_OBJECT_UNAVAILABLE');
   const sourceBytes=Buffer.from(await source.data.arrayBuffer());
   if(sourceBytes.length>5242880)throw new Error('LEGACY_OBJECT_TOO_LARGE');
   const extension=/\.(jpe?g|png|webp)$/i.exec(original)?.[1].toLowerCase();
   if(!extension)throw new Error('LEGACY_OBJECT_TYPE_UNSUPPORTED');
   const suffix=extension==='jpeg'?'jpg':extension;
   const alreadyCore=typeof row.photo_object_key==='string'&&row.photo_object_key.startsWith('core/');
   if(row.photo_object_key!==null&&row.photo_object_key!==row.photo_url&&!alreadyCore)throw new Error('EXISTING_CORE_REFERENCE_INVALID');
   const destination=alreadyCore?row.photo_object_key:`core/${randomUUID()}.${suffix}`;
   if(!/^core\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(destination))throw new Error('EXISTING_CORE_REFERENCE_INVALID');
   if(!alreadyCore){
     const result=await storage.storage.from('occurrence_photos').copy(original,destination,{destinationBucket:'core-occurrence-evidence'});
     if(result.error)throw new Error('PRIVATE_COPY_FAILED');
   }
   const target=await storage.storage.from('core-occurrence-evidence').download(destination);
   if(target.error||!target.data)throw new Error('PRIVATE_COPY_UNAVAILABLE');
   const targetBytes=Buffer.from(await target.data.arrayBuffer());
   if(hash(sourceBytes)!==hash(targetBytes))throw new Error('PRIVATE_COPY_CONTENT_MISMATCH');
   bytesVerified+=targetBytes.length;
   if(alreadyCore){alreadyVerified++;continue;}
   await db.query('BEGIN');
   try{
     const saved=await db.query('UPDATE public.occurrence_private_data SET photo_object_key=$1 WHERE occurrence_id=$2 AND photo_object_key IS NOT DISTINCT FROM $3 RETURNING occurrence_id',[destination,row.id,row.photo_object_key]);
     if(saved.rowCount!==1)throw new Error('LEGACY_REFERENCE_CHANGED');
     await db.query("INSERT INTO public.audit_events(entity_id,kind,reason,changes) VALUES($1,'LEGACY_PRIVATE_PHOTO_IMPORTED','Preservação privada da evidência legada',$2)",[row.id,JSON.stringify({bytes:targetBytes.length,sha256:hash(targetBytes),originalPreserved:true})]);
     await db.query('COMMIT');copied++;
   }catch(error){await db.query('ROLLBACK');throw error;}
 }
 const report={result:'approved',references:rows.length,copied,alreadyVerified,bytesVerified,originalObjectsPreserved:true,legacySqlReferencesPreserved:true,finishedAt:new Date().toISOString()};
 mkdirSync('docs/releases/core/testing/results',{recursive:true});
 writeFileSync('docs/releases/core/testing/results/legacy-private-photos-2026-10-01.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({result:'failed',code:/^[A-Z_]+$/.test(error.message)?error.message:'LEGACY_PHOTO_MIGRATION_FAILED'}));process.exitCode=1;}finally{await db.end();}
