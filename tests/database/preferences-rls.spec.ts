import {test,expect} from '@playwright/test';
import pg from 'pg';
import {accounts} from '../fixtures/access';
test('RNF-001 RLS de preferências limita leitura e escrita à própria conta',async()=>{
  const db=new pg.Client({connectionString:process.env.CORE_ACCESS_RUNTIME_URL});await db.connect();const operator=accounts.find(a=>a.name==='operador')!,other=accounts.find(a=>a.name==='gestor')!;
  try{
    await db.query('BEGIN');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[operator.id]);
    expect((await db.query('SELECT user_id FROM public.user_preferences')).rows).toEqual([{user_id:operator.id}]);
    expect((await db.query("UPDATE public.user_preferences SET columns='[\"protocol\"]' WHERE user_id=$1",[other.id])).rowCount).toBe(0);
    await expect(db.query("INSERT INTO public.user_preferences(user_id,columns) VALUES($1,'[\"protocol\"]') ON CONFLICT(user_id) DO UPDATE SET columns=EXCLUDED.columns",[other.id])).rejects.toMatchObject({code:'42501'});
  }finally{await db.query('ROLLBACK');await db.end();}
});
test('RNF-001 SQL direto recusa colunas privadas para Consulta e colunas arbitrárias',async()=>{
  const db=new pg.Client({connectionString:process.env.CORE_ACCESS_RUNTIME_URL});await db.connect();const consulta=accounts.find(a=>a.name==='consulta')!;
  try{
    for(const columns of [['reporterName'],['photo_url'],['protocol',{nested:'value'}]]){
      await db.query('BEGIN');await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)",[consulta.id]);
      await expect(db.query('UPDATE public.user_preferences SET columns=$1::jsonb WHERE user_id=$2',[JSON.stringify(columns),consulta.id])).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');
    }
  }finally{await db.query('ROLLBACK');await db.end();}
});
