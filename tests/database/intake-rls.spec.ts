import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {occurrenceA} from '../fixtures/access';
test('RNF-001 ingestão restrita não lê terceiros nem dados privados e limpa contexto',async()=>{
  const pool=new pg.Pool({connectionString:process.env.CORE_ACCESS_RUNTIME_URL!.replace('geoalerta_runtime','geoalerta_ingest'),max:1});
  try{
    const db=await pool.connect();const role=(await db.query('SELECT current_user,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];expect(role).toEqual({current_user:'geoalerta_ingest',rolsuper:false,rolbypassrls:false});
    await db.query('BEGIN');await db.query("SELECT set_config('core.attempt_id',$1,true),set_config('core.attempt_key',$2,true),set_config('core.origin_hash',$3,true)",[randomUUID(),randomUUID(),'fixture']);
    expect((await db.query('SELECT id FROM public.occurrences WHERE id=$1',[occurrenceA])).rows).toHaveLength(0);
    expect((await db.query('SELECT key FROM public.idempotency_keys')).rows).toHaveLength(0);
    await expect(db.query('SELECT * FROM public.occurrence_private_data')).rejects.toMatchObject({code:'42501'});await db.query('ROLLBACK');db.release();
    const next=await pool.connect();expect((await next.query("SELECT nullif(current_setting('core.attempt_id',true),'') AS id,nullif(current_setting('core.attempt_key',true),'') AS key,nullif(current_setting('core.origin_hash',true),'') AS origin")).rows[0]).toEqual({id:null,key:null,origin:null});next.release();
  }finally{await pool.end();}
});
test('RNF-002 contador compartilhado real aceita só 20 incrementos concorrentes',async()=>{
  const pool=new pg.Pool({connectionString:process.env.CORE_ACCESS_RUNTIME_URL!.replace('geoalerta_runtime','geoalerta_ingest'),max:8});const origin=randomUUID();
  try{
    const results=await Promise.all(Array.from({length:25},async()=>{
      const db=await pool.connect();try{await db.query('BEGIN');await db.query("SELECT set_config('core.origin_hash',$1,true)",[origin]);
        const result=await db.query("INSERT INTO public.intake_rate_limits(origin_hash,minute,attempts) VALUES($1,'2026-09-30T12:00:00Z',1) ON CONFLICT(origin_hash,minute) DO UPDATE SET attempts=intake_rate_limits.attempts+1 WHERE intake_rate_limits.attempts<20 RETURNING attempts",[origin]);await db.query('COMMIT');return result.rowCount;
      }finally{await db.query('ROLLBACK').catch(()=>undefined);db.release();}
    }));expect(results.filter(n=>n===1)).toHaveLength(20);expect(results.filter(n=>n===0)).toHaveLength(5);
  }finally{await pool.end();}
});
