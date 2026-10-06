import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertTestTarget} from './database';
import {groupA,groupOther} from './access';

export async function mapFixture(withLimit=false){
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await db.connect();
  const prefix=`MAP-${randomUUID()}`;
  const records=[
    {id:randomUUID(),protocol:`${prefix}-1`,type:'Queda de Árvore',status:'NOVA',priority:'NORMAL',group:groupA},
    {id:randomUUID(),protocol:`${prefix}-2`,type:'Incêndio',status:'EM_TRIAGEM',priority:'ALTA',group:groupA},
    {id:randomUUID(),protocol:`${prefix}-3`,type:'Alagamentos/Inundação',status:'EM_ATENDIMENTO',priority:'NORMAL',group:groupA},
    {id:randomUUID(),protocol:`${prefix}-4`,type:'Queda de Árvore',status:'RESOLVIDA',priority:'NORMAL',group:groupA},
    {id:randomUUID(),protocol:`${prefix}-5`,type:'Incêndio',status:'CANCELADA',priority:'NORMAL',group:groupA},
    {id:randomUUID(),protocol:`${prefix}-6`,type:'FORA DO ESCOPO',status:'NOVA',priority:'ALTA',group:groupOther},
  ];
  try{
    for(const [index,row] of records.entries())await db.query(`INSERT INTO public.occurrences(id,protocol,type,status,priority,location,accuracy,group_id,created_at)
      VALUES($1,$2,$3,$4,$5,ST_SetSRID(ST_MakePoint($6,$7),4326)::geography,10,$8,'2022-01-01T12:00:00Z')`,[row.id,row.protocol,row.type,row.status,row.priority,-50.5+index*.002,-29.8+index*.002,row.group]);
    if(withLimit)await db.query(`INSERT INTO public.occurrences(id,protocol,type,status,priority,location,accuracy,group_id,created_at)
      SELECT gen_random_uuid(),$1||'-LIMIT-'||series,'Limite de teste','NOVA','NORMAL',ST_SetSRID(ST_MakePoint(-50.5,-29.8),4326)::geography,10,$2,'2022-01-02T12:00:00Z' FROM generate_series(1,1001) series`,[prefix,groupA]);
  }finally{await db.end();}
  return {records,cleanup:async()=>{
    const cleanup=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await cleanup.connect();
    try{await cleanup.query('DELETE FROM public.occurrences WHERE protocol LIKE $1',[`${prefix}%`]);}finally{await cleanup.end();}
  }};
}
