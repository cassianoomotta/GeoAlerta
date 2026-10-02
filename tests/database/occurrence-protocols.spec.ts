import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {assertTestTarget} from '../fixtures/database';

test('RF-009 protocolos migrados são numéricos e a sequência do banco cria os próximos',async()=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  await db.connect();
  let insertedId:string|undefined;
  try{
    const migrated=(await db.query("SELECT protocol FROM public.occurrences WHERE legacy_status IS NOT NULL ORDER BY created_at,id")).rows;
    expect(migrated.length).toBeGreaterThan(0);
    expect(migrated.every(row=>/^\d+$/.test(row.protocol))).toBe(true);

    const mismatch=(await db.query(`SELECT count(*)::int AS count FROM public.idempotency_keys k JOIN public.occurrences o ON o.id=k.occurrence_id WHERE k.response->>'protocol' IS DISTINCT FROM o.protocol`)).rows[0].count;
    expect(mismatch).toBe(0);
    expect((await db.query("SELECT has_sequence_privilege('geoalerta_runtime','public.occurrence_protocol_seq','USAGE') AS runtime_can_generate,has_sequence_privilege('geoalerta_ingest','public.occurrence_protocol_seq','USAGE') AS ingest_can_generate,has_sequence_privilege('anon','public.occurrence_protocol_seq','USAGE') AS anon_can_generate")).rows[0]).toEqual({runtime_can_generate:true,ingest_can_generate:true,anon_can_generate:false});

    const inserted=(await db.query(`INSERT INTO public.occurrences(type,description,location,accuracy,status,priority,group_id) SELECT 'fixture','numeric protocol sequence fixture',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,5,'NOVA','NORMAL',id FROM public.groups ORDER BY id LIMIT 1 RETURNING id::text AS id,protocol`)).rows[0];
    insertedId=inserted.id;
    expect(inserted.protocol).toMatch(/^\d+$/);
    const maxProtocol=(await db.query("SELECT max(protocol::bigint) AS value FROM public.occurrences WHERE protocol ~ '^[0-9]+$'")).rows[0].value;
    expect(BigInt(inserted.protocol)).toBe(BigInt(maxProtocol));
  }finally{
    if(insertedId)await db.query('DELETE FROM public.occurrences WHERE id=$1',[insertedId]);
    await db.end();
  }
});

test('RF-009 migration renumera somente protocolos LEGACY e sincroniza cache e sequência',async()=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});
  const schema=`core_test_protocol_${randomUUID().replaceAll('-','')}`;
  const legacyA='91000000-0000-4000-8000-000000000001';
  const legacyB='91000000-0000-4000-8000-000000000002';
  const current='91000000-0000-4000-8000-000000000003';
  try{
    await db.connect();
    await db.query(`CREATE SCHEMA ${schema}`);
    await db.query(`CREATE TABLE ${schema}.occurrences(id uuid PRIMARY KEY,created_at timestamptz NOT NULL,legacy_status text,protocol text NOT NULL UNIQUE)`);
    await db.query(`CREATE TABLE ${schema}.idempotency_keys(key text PRIMARY KEY,occurrence_id uuid,response jsonb NOT NULL)`);
    await db.query(`INSERT INTO ${schema}.occurrences VALUES
      ($1,'2024-01-01','Aberto','LEGACY-old-a'),($2,'2024-01-02','Resolvido','LEGACY-old-b'),
      ($3,'2024-01-03',NULL,'GA-keep'),('91000000-0000-4000-8000-000000000004','2024-01-04',NULL,'40')`,[legacyA,legacyB,current]);
    await db.query(`INSERT INTO ${schema}.idempotency_keys VALUES
      ('old-a',$1,'{"protocol":"LEGACY-old-a"}'),('keep',$2,'{"protocol":"GA-keep"}')`,[legacyA,current]);

    const migration=readFileSync('prisma/migrations/202610020003_numeric_occurrence_protocols/migration.sql','utf8').replaceAll('public.',`${schema}.`);
    await db.query(migration);

    const rows=(await db.query(`SELECT id::text AS id,protocol FROM ${schema}.occurrences ORDER BY created_at`)).rows;
    expect(rows).toEqual([
      {id:legacyA,protocol:'41'},
      {id:legacyB,protocol:'42'},
      {id:current,protocol:'GA-keep'},
      {id:'91000000-0000-4000-8000-000000000004',protocol:'40'},
    ]);
    expect((await db.query(`SELECT key,response->>'protocol' AS protocol FROM ${schema}.idempotency_keys ORDER BY key`)).rows).toEqual([{key:'keep',protocol:'GA-keep'},{key:'old-a',protocol:'41'}]);

    const pool=new pg.Pool({connectionString:process.env.TEST_DATABASE_URL,max:8});
    try{
      const generated=await Promise.all(Array.from({length:8},()=>pool.query(`INSERT INTO ${schema}.occurrences(id,created_at) VALUES(gen_random_uuid(),now()) RETURNING protocol`)));
      const protocols=generated.map(result=>result.rows[0].protocol);
      expect(protocols.every(protocol=>/^\d+$/.test(protocol))).toBe(true);
      expect(new Set(protocols).size).toBe(8);
      expect(protocols.map(Number).sort((a,b)=>a-b)).toEqual([43,44,45,46,47,48,49,50]);
    }finally{await pool.end();}
  }finally{
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(()=>undefined);
    await db.end();
  }
});
