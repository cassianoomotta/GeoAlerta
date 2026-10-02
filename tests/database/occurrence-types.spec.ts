import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertTestTarget} from '../fixtures/database';

test('RF-001 catálogo é semeado, protegido por RLS e não substitui o tipo histórico',async()=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await db.connect();
  try{
    const types=(await db.query('SELECT name,active,display_order FROM public.occurrence_types WHERE display_order BETWEEN 1 AND 30 ORDER BY display_order')).rows;
    expect(types).toHaveLength(30);
    expect(types.every((type,index)=>type.active&&type.display_order===index+1)).toBe(true);
    expect(types[0].name).toBe('Alagamentos/Inundação');
    const rls=(await db.query("SELECT c.relrowsecurity AS enabled, EXISTS(SELECT FROM pg_policies p WHERE p.schemaname='public' AND p.tablename='occurrence_types' AND p.policyname='ingest_active_occurrence_types' AND p.roles @> ARRAY['geoalerta_ingest']::name[] AND p.qual='active') AS active_policy FROM pg_class c WHERE c.oid='public.occurrence_types'::regclass")).rows[0];
    expect(rls).toEqual({enabled:true,active_policy:true});
    const column=(await db.query("SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrences' AND column_name='type'")).rows[0];
    expect(column.data_type).toBe('text');
  }finally{await db.end();}
});

test('RF-009 runtime pode consultar categorias ativas e desativadas sem alterar catálogo',async()=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  const runtime=new pg.Pool({connectionString:process.env.CORE_ACCESS_RUNTIME_URL!,max:1});
  const name=`Tipo runtime ${randomUUID()}`;
  try{
    await admin.connect();
    await admin.query('INSERT INTO public.occurrence_types(name,active,display_order) VALUES($1,true,32767)',[name]);
    const restricted=await runtime.connect();
    try{
      expect((await restricted.query('SELECT name,active FROM public.occurrence_types WHERE name=$1',[name])).rows).toEqual([{name,active:true}]);
      await admin.query('UPDATE public.occurrence_types SET active=false WHERE name=$1',[name]);
      expect((await restricted.query('SELECT name,active FROM public.occurrence_types WHERE name=$1',[name])).rows).toEqual([{name,active:false}]);
      expect((await restricted.query("SELECT has_table_privilege(current_user,'public.occurrence_types','UPDATE') AS can_update,has_table_privilege('anon','public.occurrence_types','SELECT') AS anon_can_read")).rows[0]).toEqual({can_update:false,anon_can_read:false});
    }finally{restricted.release();}
  }finally{
    await admin.query('DELETE FROM public.occurrence_types WHERE name=$1',[name]).catch(()=>undefined);
    await admin.end();await runtime.end();
  }
});

test('RF-001 usuário de ingestão enxerga tipos ativos e não pode alterar o catálogo',async()=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const admin=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  const ingest=new pg.Pool({connectionString:process.env.CORE_ACCESS_RUNTIME_URL!.replace('geoalerta_runtime','geoalerta_ingest'),max:1});
  const name=`Tipo fixture ${randomUUID()}`;
  try{
    await admin.connect();
    await admin.query('INSERT INTO public.occurrence_types(name,active,display_order) VALUES($1,true,32767)',[name]);
    const restricted=await ingest.connect();
    try{
      expect((await restricted.query('SELECT name FROM public.occurrence_types WHERE name=$1',[name])).rows).toEqual([{name}]);
      expect((await restricted.query("SELECT has_table_privilege(current_user,'public.occurrence_types','UPDATE') AS can_update,has_table_privilege('anon','public.occurrence_types','SELECT') AS anon_can_read")).rows[0]).toEqual({can_update:false,anon_can_read:false});
      await admin.query('UPDATE public.occurrence_types SET active=false WHERE name=$1',[name]);
      expect((await restricted.query('SELECT name FROM public.occurrence_types WHERE name=$1',[name])).rows).toEqual([]);
    }finally{restricted.release();}
  }finally{
    await admin.query('DELETE FROM public.occurrence_types WHERE name=$1',[name]).catch(()=>undefined);
    await admin.end();await ingest.end();
  }
});
