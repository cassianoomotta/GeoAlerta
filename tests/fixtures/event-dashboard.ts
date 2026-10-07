import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertTestTarget} from './database';
import {groupA,groupB} from './access';

export async function eventDashboardFixture(){
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
  const ids={active:randomUUID(),closedB:randomUUID(),closedC:randomUUID(),empty:randomUUID(),planned:randomUUID(),otherMunicipality:randomUUID()};
  const hiddenGroupId=randomUUID();
  const occurrenceIds:string[]=[];
  const activeOccurrenceIds:string[]=[];
  try{
    await db.query('BEGIN');
    await db.query("SET LOCAL session_replication_role='replica'");
    await db.query("INSERT INTO public.groups(id,municipality_id,name) VALUES($1,'sa_patrulha',$2)",[hiddenGroupId,`Hidden dashboard ${hiddenGroupId.slice(0,8)}`]);
    for(const [key,id,state,municipality] of [
      ['active',ids.active,'EM_ANDAMENTO','sa_patrulha'],['closedB',ids.closedB,'ENCERRADO','sa_patrulha'],['closedC',ids.closedC,'ENCERRADO','sa_patrulha'],['empty',ids.empty,'ENCERRADO','sa_patrulha'],['planned',ids.planned,'PLANEJADO','sa_patrulha'],['otherMunicipality',ids.otherMunicipality,'ENCERRADO','other'],
    ] as const){
      await db.query(`INSERT INTO public.climate_events(id,municipality_id,name,planned_start,planned_end,state,started_at,ended_at,created_by)
        VALUES($1,$2,$3,'2024-01-01','2024-01-03',$4,CASE WHEN $4='PLANEJADO' THEN NULL ELSE '2024-01-01T12:00:00Z'::timestamptz END,CASE WHEN $4='ENCERRADO' THEN '2024-01-03T12:00:00Z'::timestamptz END,'10000000-0000-4000-8000-000000000003')`,[id,municipality,`Fixture ${key}`,state]);
    }
    const seed=[
      ['Alagamento','NORMAL',true,'NOVA',groupA],['Alagamento','NORMAL',true,'EM_TRIAGEM',groupA],['Alagamento','ALTA',false,'EM_ATENDIMENTO',groupB],
      ['Deslizamento','ALTA',false,'RESOLVIDA',groupA],['Deslizamento','NORMAL',false,'RESOLVIDA',groupB],['Outro','NORMAL',null,'CANCELADA',groupA],
      ['Oculto','ALTA',true,'NOVA',hiddenGroupId],['Excluído','NORMAL',false,'RESOLVIDA',groupA],['Sem evento','NORMAL',false,'NOVA',groupA],
    ] as const;
    for(let index=0;index<seed.length;index++){
      const [type,priority,medical,status,group]=seed[index];
      const id=randomUUID();occurrenceIds.push(id);
      if(index<6)activeOccurrenceIds.push(id);
      const event=index<6?ids.active:index===6?ids.active:index===7?ids.active:null;
      const deleted=index===7?'2024-01-04T00:00:00Z':null;
      await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,status,priority,group_id,climate_event_id,needs_medical_support,created_at,deleted_at)
        VALUES($1,$2,$3,'synthetic event dashboard fixture',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$4,$5,$6,$7,$8,'2024-01-02T12:00:00Z',$9)`,[id,`EVENT-DASH-${id}`,type,status,priority,group,event,medical,deleted]);
    }
    await db.query("UPDATE public.occurrences SET registering_institution_code=CASE WHEN id=$1 THEN 'CIDADAO' ELSE 'BOMBEIROS_MILITAR' END WHERE id=ANY($2::uuid[])",[activeOccurrenceIds[0],activeOccurrenceIds.slice(0,2)]);
    for(let index=0;index<120;index++){
      const id=randomUUID();occurrenceIds.push(id);
      await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,status,priority,group_id,climate_event_id,needs_medical_support,created_at)
        VALUES($1,$2,$3,'synthetic old event fixture',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$4,$5,$6,$7,$8,'2023-01-02T12:00:00Z')`,[id,`EVENT-DASH-${id}`,index===119?'Tipo histórico inativo':'Categoria C',index%2?'RESOLVIDA':'NOVA',index%3?'NORMAL':'ALTA',groupA,ids.closedC,index%3===0?true:index%3===1?false:null]);
    }
    await db.query('COMMIT');
  }catch(error){await db.query('ROLLBACK').catch(()=>undefined);throw error;}finally{await db.end();}
  const mutate=async(query:string,values:unknown[])=>{
    const update=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await update.connect();
    try{await update.query('BEGIN');await update.query("SET LOCAL session_replication_role='replica'");await update.query(query,values);await update.query('COMMIT');}
    catch(error){await update.query('ROLLBACK').catch(()=>undefined);throw error;}finally{await update.end();}
  };
  return {ids,activeOccurrenceIds,
    addOccurrence:async(eventId:string)=>{
      const id=randomUUID();occurrenceIds.push(id);
      await mutate(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,status,priority,group_id,climate_event_id,needs_medical_support,created_at)
        VALUES($1,$2,'Adicionado no refresh','synthetic dashboard refresh fixture',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,'NOVA','NORMAL',$3,$4,NULL,'2022-01-02T12:00:00Z')`,[id,`EVENT-DASH-${id}`,groupA,eventId]);
      return id;
    },
    changeOccurrenceStatus:(id:string,status:string)=>mutate('UPDATE public.occurrences SET status=$2 WHERE id=$1',[id,status]),
    linkOccurrence:(id:string,eventId:string)=>mutate('UPDATE public.occurrences SET climate_event_id=$2 WHERE id=$1',[id,eventId]),
    deleteOccurrence:(id:string)=>mutate('UPDATE public.occurrences SET deleted_at=transaction_timestamp() WHERE id=$1',[id]),
    closeActiveEvent:()=>mutate("UPDATE public.climate_events SET state='ENCERRADO',ended_at=transaction_timestamp(),version=version+1 WHERE id=$1",[ids.active]),cleanup:async()=>{
    const cleanup=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await cleanup.connect();
    try{await cleanup.query('BEGIN');await cleanup.query("SET LOCAL session_replication_role='replica'");await cleanup.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])',[occurrenceIds]);await cleanup.query('DELETE FROM public.climate_events WHERE id=ANY($1::uuid[])',[Object.values(ids)]);await cleanup.query('DELETE FROM public.groups WHERE id=$1',[hiddenGroupId]);await cleanup.query('COMMIT');}
    catch(error){await cleanup.query('ROLLBACK').catch(()=>undefined);throw error;}finally{await cleanup.end();}
  }};
}
