import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {groupA,groupB,groupOther} from './access';

export async function dashboardFixture(){
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
  const ids=Array.from({length:6},()=>randomUUID());
  try{
    for(const [index,row] of [
      [groupA,'2024-06-01T02:59:59Z','NOVA','NORMAL',false],
      [groupA,'2024-06-01T03:00:00Z','NOVA','NORMAL',false],
      [groupA,'2024-05-15T12:00:00Z','RESOLVIDA','NORMAL',false],
      [groupB,'2024-06-02T12:00:00Z','EM_ATENDIMENTO','ALTA',false],
      [groupOther,'2024-06-01T12:00:00Z','NOVA','NORMAL',false],
      [groupA,'2024-06-01T12:00:00Z','NOVA','NORMAL',true],
    ].entries()){
      await db.query(`INSERT INTO public.occurrences(id,protocol,type,location,accuracy,group_id,created_at,status,priority,deleted_at) VALUES($1,$2,'Resgate de teste',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$3,$4,$5,$6,CASE WHEN $7 THEN now() ELSE NULL END)`,[ids[index],`DASH-${ids[index]}`,...row]);
    }
    await db.query(`INSERT INTO public.occurrence_events(occurrence_id,kind,at,changes) VALUES($1,'STATUS_TRANSITIONED','2024-06-02T15:00:00Z','{"status":{"from":"EM_ATENDIMENTO","to":"RESOLVIDA"}}')`,[ids[2]]);
  }finally{await db.end();}
  return async()=>{
    const cleanup=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await cleanup.connect();
    try{await cleanup.query('DELETE FROM public.occurrence_events WHERE occurrence_id=ANY($1::uuid[])',[ids]);await cleanup.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])',[ids]);}finally{await cleanup.end();}
  };
}
