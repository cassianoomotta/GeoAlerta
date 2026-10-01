import type pg from 'pg';
import {randomUUID} from 'node:crypto';
import {groupA,groupB,groupOther,accounts} from './access';
export const listType=()=>process.env.CORE_LIST_FIXTURE_TYPE!;
export async function prepareListTests(db:pg.Client){
  const type=`list-${randomUUID()}`;process.env.CORE_LIST_FIXTURE_TYPE=type;
  for(const [group,n,deleted]of [[groupA,125,false],[groupB,8,false],[groupOther,4,false],[groupA,3,true]] as const){
    await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,group_id,status,priority,created_at,deleted_at)
      SELECT gen_random_uuid(),'LIST-'||gen_random_uuid()::text,$1,'Synthetic list fixture',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,5,$2,
      (ARRAY['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'])[1+(i%5)],CASE WHEN i%2=0 THEN 'ALTA' ELSE 'NORMAL' END,
      '2025-01-01T00:00:00Z'::timestamptz+(i/2)*interval '1 hour',CASE WHEN $4 THEN now() ELSE NULL END FROM generate_series(0,$3-1) i`,[type,group,n,deleted]);
  }
  await db.query(`INSERT INTO public.occurrence_private_data(occurrence_id,reporter_name,reporter_contact) SELECT id,'Synthetic private name','Synthetic private contact' FROM public.occurrences WHERE type=$1`,[type]);
  for(const a of accounts)await db.query(`INSERT INTO public.user_preferences(user_id,columns) VALUES($1,'["protocol","createdAt","status","priority","type","groupId"]') ON CONFLICT(user_id) DO UPDATE SET columns=EXCLUDED.columns`,[a.id]);
}
