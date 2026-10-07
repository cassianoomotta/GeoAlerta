import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { assertTestTarget } from '../fixtures/database';

const createdIds: string[] = [];
const hiddenOccurrenceIds: string[]=[];
const hiddenGroupIds: string[]=[];
const managerId='10000000-0000-4000-8000-000000000003';
const otherAdminId='10000000-0000-4000-8000-000000000009';
let otherMunicipalActiveId:string|null=null;
async function dbClient() {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL}); await db.connect(); return db;
}
async function assume(db:pg.Client,userId:string) {
  await db.query('SET LOCAL ROLE geoalerta_runtime');
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[userId,JSON.stringify({sub:userId})]);
}
test.afterAll(async()=>{
  if(!createdIds.length)return;
  const db=await dbClient();
  try{
    if(hiddenOccurrenceIds.length)await db.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])',[hiddenOccurrenceIds]);
    await db.query('DELETE FROM public.audit_events WHERE entity_id=ANY($1::uuid[])',[createdIds]);
    await db.query('DELETE FROM public.climate_events WHERE id=ANY($1::uuid[])',[createdIds]);
    if(hiddenGroupIds.length)await db.query('DELETE FROM public.groups WHERE id=ANY($1::uuid[])',[hiddenGroupIds]);
  }
  finally{await db.end();}
});

test('climate event schema exists additively and preserves the occurrence table', async () => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    const result = await db.query<{ event_table: string | null; event_link: boolean; occurrence_count: string; preserved_rows: string; unlinked_legacy_rows: string }>(`
      SELECT to_regclass('public.climate_events')::text AS event_table,
        EXISTS (SELECT FROM information_schema.columns
          WHERE table_schema='public' AND table_name='occurrences' AND column_name='climate_event_id') AS event_link,
        (SELECT count(*)::text FROM public.occurrences) AS occurrence_count,
        (SELECT count(*)::text FROM public.occurrences WHERE id IN (
          '30000000-0000-4000-8000-000000000001'::uuid,
          '30000000-0000-4000-8000-000000000002'::uuid,
          '30000000-0000-4000-8000-000000000003'::uuid
        )) AS preserved_rows,
        (SELECT count(*)::text FROM public.occurrences WHERE id IN (
          '30000000-0000-4000-8000-000000000001'::uuid,
          '30000000-0000-4000-8000-000000000002'::uuid,
          '30000000-0000-4000-8000-000000000003'::uuid
        ) AND climate_event_id IS NULL) AS unlinked_legacy_rows
    `);
    expect(result.rows[0].event_table).toBe('climate_events');
    expect(result.rows[0].event_link).toBe(true);
    expect(BigInt(result.rows[0].occurrence_count)).toBeGreaterThanOrEqual(BigInt(3));
    expect(result.rows[0].preserved_rows).toBe('3');
    expect(result.rows[0].unlinked_legacy_rows).toBe('3');
  } finally {
    await db.end();
  }
});

test('climate event RLS exposes only active events to restricted intake and allows concurrent starts by municipality', async()=>{
  const ids:string[]=[];
  const db=await dbClient();
  try{
    await db.query('BEGIN'); await assume(db,managerId);
    for(let index=0;index<2;index++){
      const event=(await db.query("INSERT INTO public.climate_events(municipality_id,name,planned_start,planned_end) VALUES('sa_patrulha',$1,'2026-10-06','2026-10-08') RETURNING id::text",[`Concurrent ${randomUUID().slice(0,8)}`])).rows[0];
      ids.push(event.id);
    }
    await db.query('COMMIT');
    createdIds.push(...ids);
    const createOther=await dbClient();
    try{
      await createOther.query('BEGIN'); await assume(createOther,otherAdminId);
      const other=(await createOther.query("INSERT INTO public.climate_events(municipality_id,name,planned_start,planned_end) VALUES('other','Other municipality','2026-10-06','2026-10-08') RETURNING id::text")).rows[0];
      ids.push(other.id); createdIds.push(other.id);
      otherMunicipalActiveId=other.id;
      await createOther.query("UPDATE public.climate_events SET state='EM_ANDAMENTO',version=version+1 WHERE id=$1",[other.id]);
      await createOther.query('COMMIT');
    }catch(error){await createOther.query('ROLLBACK').catch(()=>undefined);throw error;}finally{await createOther.end();}

    const attempts=await Promise.all(ids.slice(0,2).map(async id=>{
      const client=await dbClient();
      try{await client.query('BEGIN');await assume(client,managerId);const result=await client.query("UPDATE public.climate_events SET state='EM_ANDAMENTO',version=version+1 WHERE id=$1 AND state='PLANEJADO' AND version=1",[id]);await client.query('COMMIT');return result.rowCount;}
      catch(error){await client.query('ROLLBACK').catch(()=>undefined);if(typeof error==='object'&&error!==null&&'code' in error&&error.code==='23505')return 0;throw error;}finally{await client.end();}
    }));
    expect(attempts.filter(count=>count===1)).toHaveLength(1);
    expect(attempts.filter(count=>count===0)).toHaveLength(1);

    const ingest=new pg.Client({connectionString:process.env.CORE_ACCESS_RUNTIME_URL!.replace('geoalerta_runtime','geoalerta_ingest')}); await ingest.connect();
    try{
      const rows=await ingest.query('SELECT id::text FROM public.climate_events WHERE id=ANY($1::uuid[])',[ids]);
      expect(rows.rows).toHaveLength(1); expect(rows.rows[0].id).toBe(ids[attempts.findIndex(count=>count===1)]);
    }finally{await ingest.end();}
    const activeId=ids[attempts.findIndex(count=>count===1)];
    await db.query('BEGIN');await assume(db,managerId);
    await db.query("UPDATE public.climate_events SET state='ENCERRADO',version=version+1 WHERE id=$1 AND state='EM_ANDAMENTO'",[activeId]);
    await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK').catch(()=>undefined);throw error;}
  finally{await db.end();}
});

test('closing checks every nonterminal code including soft-deleted and hidden rows',async()=>{
  let eventId='';const pendingOccurrence=randomUUID(),cancelledOccurrence=randomUUID(),hiddenGroup=randomUUID();hiddenOccurrenceIds.push(pendingOccurrence,cancelledOccurrence);hiddenGroupIds.push(hiddenGroup);
  const db=await dbClient();
  try{
    await db.query("INSERT INTO public.groups(id,municipality_id,name) VALUES($1,'sa_patrulha',$2)",[hiddenGroup,`Hidden climate ${randomUUID().slice(0,8)}`]);
    await db.query('BEGIN');await assume(db,managerId);
    const created=await db.query("INSERT INTO public.climate_events(municipality_id,name,planned_start,planned_end) VALUES('sa_patrulha','Hidden blocker','2026-10-06','2026-10-08') RETURNING id::text");
    expect(created.rows).toHaveLength(1);
    eventId=created.rows[0].id;createdIds.push(eventId);
    await db.query("UPDATE public.climate_events SET state='EM_ANDAMENTO',version=version+1 WHERE id=$1",[eventId]);
    await db.query('COMMIT');
    await db.query("INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,status,priority,group_id,climate_event_id,reporter_name,photo_url,deleted_at) VALUES($1,$2,'fixture','synthetic hidden pending',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,'NOVA','NORMAL',$3,$4,'Synthetic','private/photo',transaction_timestamp()),($5,$6,'fixture','synthetic hidden cancelled',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,'CANCELADA','NORMAL',$3,$4,'Synthetic','private/photo',transaction_timestamp())",[pendingOccurrence,`CLIMATE-${pendingOccurrence.slice(0,8)}`,hiddenGroup,eventId,cancelledOccurrence,`CLIMATE-${cancelledOccurrence.slice(0,8)}`]);
    expect(otherMunicipalActiveId).toBeTruthy();
    let crossMunicipality:unknown;
    try{await db.query('UPDATE public.occurrences SET climate_event_id=$1 WHERE id=$2',[otherMunicipalActiveId,pendingOccurrence]);}
    catch(error){crossMunicipality=error;}
    expect(crossMunicipality).toMatchObject({code:'23514'});
    for(const status of ['NOVA','EM_TRIAGEM','EM_ATENDIMENTO']){
      if(status!=='NOVA'){
        await db.query('BEGIN');await db.query("SET LOCAL session_replication_role='replica'");
        await db.query('UPDATE public.occurrences SET status=$1 WHERE id=$2',[status,pendingOccurrence]);await db.query('COMMIT');
      }
      await db.query('BEGIN');await assume(db,managerId);let blocked:unknown;
      try{await db.query("UPDATE public.climate_events SET state='ENCERRADO',version=version+1 WHERE id=$1 AND version=2",[eventId]);await db.query('COMMIT');}
      catch(error){blocked=error;await db.query('ROLLBACK').catch(()=>undefined);}
      expect(blocked,`blocked status ${status}`).toMatchObject({code:'23514'});
      const unchanged=await db.query('SELECT state,version FROM public.climate_events WHERE id=$1',[eventId]);expect(unchanged.rows[0]).toEqual({state:'EM_ANDAMENTO',version:2});
    }
    await db.query('BEGIN');await db.query("SET LOCAL session_replication_role='replica'");
    await db.query("UPDATE public.occurrences SET status='RESOLVIDA' WHERE id=$1",[pendingOccurrence]);await db.query('COMMIT');
    await db.query('BEGIN');await assume(db,managerId);
    await db.query("UPDATE public.climate_events SET state='ENCERRADO',version=version+1 WHERE id=$1 AND version=2",[eventId]);await db.query('COMMIT');
    expect((await db.query("SELECT count(*)::int AS n FROM public.audit_events WHERE entity_id=$1 AND kind='CLIMATE_EVENT_CLOSED'",[eventId])).rows[0].n).toBe(1);
  }finally{await db.end();}
});
