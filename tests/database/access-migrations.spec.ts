import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {assertTestTarget} from '../fixtures/database';
import {resolveExecutable} from '../../scripts/with-env.mjs';
test('RNF-007 histórico completo de acesso reproduz RLS em schema vazio sem alterar dados legados',async()=>{
  test.setTimeout(120000);assertTestTarget(process.env.TEST_DATABASE_URL);
  const scope=`core_test_access_${randomUUID().replaceAll('-','')}`;
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
  const names=['0_legacy','202609300001_core_foundation','202609300002_legacy_provenance','202609300003_access_rls','202609300004_access_field_guards','202609300005_access_reopen_guard','202609300006_public_intake'];
  const rewrite=(sql:string)=>sql.replace(/\bpublic\./g,`${scope}.`).replaceAll("'public'",`'${scope}'`).replace(/\bauth\./g,`${scope}_auth.`).replace(/\bstorage\./g,`${scope}_storage.`).replaceAll('supabase_realtime',`${scope}_publication`).replaceAll('ON SCHEMA public,auth',`ON SCHEMA ${scope},${scope}_auth`);
  try{
    const before=(await db.query('SELECT id,reporter_name,photo_url,status FROM public.occurrences ORDER BY id')).rows;
    await db.query(`CREATE SCHEMA ${scope}`);await db.query(`SET search_path TO ${scope},public`);
    const platform=rewrite(readFileSync('tests/fixtures/platform.sql','utf8')).replace('CREATE SCHEMA IF NOT EXISTS auth;',`CREATE SCHEMA IF NOT EXISTS ${scope}_auth;`).replace('CREATE SCHEMA IF NOT EXISTS storage;',`CREATE SCHEMA IF NOT EXISTS ${scope}_storage;`);
    await db.query(platform);
    const folder=`.cache/${scope}`;
    for(const name of names){mkdirSync(`${folder}/${name}`,{recursive:true});writeFileSync(`${folder}/${name}/migration.sql`,rewrite(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8')).replace('BEGIN;',`BEGIN;SET search_path TO ${scope},public;`));}
    writeFileSync(`${folder}/migration_lock.toml`,'provider = "postgresql"\n');
    const direct=new URL(process.env.TEST_DATABASE_URL!);direct.searchParams.set('schema',scope);
    const result=spawnSync(process.execPath,[resolveExecutable('prisma'),'migrate','deploy'],{env:{...process.env,DIRECT_URL:direct.toString(),CORE_TEST_MIGRATIONS_PATH:folder},encoding:'utf8',timeout:90000});
    expect(result.status,'isolated full-history replay').toBe(0);
    expect((await db.query(`SELECT migration_name FROM ${scope}._prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name`)).rows.map(r=>r.migration_name)).toEqual(names);
    expect((await db.query('SELECT id,reporter_name,photo_url,status FROM public.occurrences ORDER BY id')).rows).toEqual(before);
    expect((await db.query('SELECT tablename FROM pg_publication_tables WHERE pubname=$1',[`${scope}_publication`])).rows).toEqual([{tablename:'occurrence_alerts'}]);
  }finally{await db.end();}
});
