import {expect,test} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {accounts,groupA,groupB,groupOther} from '../fixtures/access';

test('atividade conta encerramentos reais uma vez por ocorrência/dia e respeita acesso sem expor o histórico',async()=>{
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
  try{
    await db.query('BEGIN');
    const ids=Array.from({length:5},()=>randomUUID());
    for(const [index,group] of [groupA,groupA,groupB,groupOther,groupA].entries()){
      await db.query(`INSERT INTO public.occurrences(id,protocol,type,location,accuracy,group_id,created_at,deleted_at) VALUES($1,$2,'dashboard-test',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$3,'2024-04-01',CASE WHEN $4 THEN now() ELSE NULL END)`,[ids[index],`DASH-${ids[index]}`,group,index===4]);
      await db.query(`INSERT INTO public.occurrence_events(occurrence_id,kind,at,changes) VALUES($1,'STATUS_TRANSITIONED','2024-05-02T02:59:59Z','{"status":{"from":"EM_ATENDIMENTO","to":"RESOLVIDA"}}')`,[ids[index]]);
    }
    // A repeated event, an edit after closure and terminal-to-terminal changes must not inflate closures.
    await db.query(`INSERT INTO public.occurrence_events(occurrence_id,kind,at,changes) VALUES
      ($1,'STATUS_TRANSITIONED','2024-05-02T02:00:00Z','{"status":{"from":"EM_ATENDIMENTO","to":"RESOLVIDA"}}'),
      ($1,'OCCURRENCE_EDITED','2024-05-02T12:00:00Z','{}'),
      ($1,'STATUS_TRANSITIONED','2024-05-02T12:00:00Z','{"status":{"from":"RESOLVIDA","to":"CANCELADA"}}'),
      ($1,'STATUS_REOPENED','2024-05-02T13:00:00Z','{"status":{"from":"RESOLVIDA","to":"EM_TRIAGEM"}}'),
      ($1,'STATUS_TRANSITIONED','2024-05-03T03:00:00Z','{"status":{"from":"EM_TRIAGEM","to":"CANCELADA"}}')`,[ids[0]]);
    // PostgreSQL stores microseconds: include the last microsecond, exclude next midnight.
    await db.query(`INSERT INTO public.occurrence_events(occurrence_id,kind,at,changes) VALUES
      ($1,'STATUS_TRANSITIONED','2024-05-04T02:59:59.999500Z','{"status":{"from":"EM_ATENDIMENTO","to":"RESOLVIDA"}}'),
      ($1,'STATUS_TRANSITIONED','2024-05-04T03:00:00Z','{"status":{"from":"EM_ATENDIMENTO","to":"RESOLVIDA"}}')`,[ids[1]]);
    await db.query('SET LOCAL ROLE geoalerta_runtime');
    for(const [name,want] of [['consulta',2],['gestor',3],['admin',3],['suspenso',0]] as const){
      const account=accounts.find(item=>item.name===name)!;
      await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[account.id]);
      const rows=(await db.query(`SELECT * FROM public.core_dashboard_closures('2024-05-01T03:00:00Z','2024-05-04T03:00:00Z')`)).rows;
      expect(rows).toEqual(want?[{day:'2024-05-01',closed:want},{day:'2024-05-03',closed:2}]:[]);
    }
    await db.query("SELECT set_config('request.jwt.claim.sub','',true)");
    expect((await db.query('SELECT * FROM public.core_dashboard_closures(NULL,NULL)')).rows).toEqual([]);
    await db.query('RESET ROLE');
    expect((await db.query("SELECT has_function_privilege('anon','public.core_dashboard_closures(timestamptz,timestamptz)','EXECUTE') AS allowed")).rows[0].allowed).toBe(false);
    expect((await db.query("SELECT has_function_privilege('authenticated','public.core_dashboard_closures(timestamptz,timestamptz)','EXECUTE') AS allowed")).rows[0].allowed).toBe(false);
  }finally{await db.query('ROLLBACK');await db.end();}
});
