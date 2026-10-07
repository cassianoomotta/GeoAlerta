import { test, expect } from '@playwright/test';
import pg from 'pg';
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { assertTestTarget, assertMigrationEnvironment } from '../fixtures/database';
import { resolveExecutable } from '../../scripts/with-env.mjs';

test.setTimeout(120_000);
const coreSQL = readFileSync('prisma/migrations/202609300001_core_foundation/migration.sql', 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
const legacyTables = ['resource_movements','resources','settings','shelter_people','shelters','team_locations','team_members','teams','volunteers'];
const migrationNames = readdirSync('prisma/migrations', { withFileTypes: true })
  .filter(entry => entry.isDirectory() && existsSync(`prisma/migrations/${entry.name}/migration.sql`))
  .map(entry => entry.name)
  .sort();
const run = randomUUID().replaceAll('-','');
const invalidSchema = `core_test_invalid_${run}`;
const legacySchema = `core_test_legacy_${run}`;
const emptySchema = `core_test_empty_${run}`;
let scope = invalidSchema;
const scopedSQL = (sql: string) => sql.replace(/\bpublic\./g, `${scope}.`).replaceAll("'public'", `'${scope}'`).replace(/\bstorage\./g, `${scope}_storage.`).replace(/\bauth\./g, `${scope}_auth.`).replaceAll('geoalerta_private', `${scope}_private`).replaceAll('supabase_realtime', `${scope}_publication`);
const scopedURL = (value: string, schema: string) => { const url = new URL(value); url.searchParams.set('schema', schema); return url.toString(); };

async function prepare(client: pg.Client, baseline: boolean) {
  // Keep the PostGIS types in the shared public schema so repeated scoped
  // migration histories can resolve geography regardless of schema creation order.
  await client.query('CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA public');
  await client.query(`CREATE SCHEMA ${scope}`);
  await client.query(`SET search_path TO ${scope},public`);
  const platform = readFileSync('tests/fixtures/platform.sql','utf8').replaceAll('CREATE SCHEMA IF NOT EXISTS auth;',`CREATE SCHEMA IF NOT EXISTS ${scope}_auth;`).replaceAll('CREATE SCHEMA IF NOT EXISTS storage;',`CREATE SCHEMA IF NOT EXISTS ${scope}_storage;`);
  await client.query(platform);
  const folder = `.cache/${scope}`;
  for (const name of migrationNames) {
    mkdirSync(`${folder}/${name}`, {recursive:true});
    const sql = scopedSQL(readFileSync(`prisma/migrations/${name}/migration.sql`,'utf8')).replace('BEGIN;',`BEGIN; SET search_path TO ${scope},public;`);
    writeFileSync(`${folder}/${name}/migration.sql`, sql);
  }
  writeFileSync(`${folder}/migration_lock.toml`, 'provider = "postgresql"\n');
  if (baseline) await client.query(readFileSync(`${folder}/0_legacy/migration.sql`,'utf8'));
}

async function connect(url: string | undefined) {
  assertTestTarget(url);
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return new Proxy(client, { get(target,key) { if (key === 'query') return (sql: string, values?: unknown[]) => target.query(scopedSQL(sql),values); const value = Reflect.get(target,key); return typeof value === 'function' ? value.bind(target) : value; } });
}
function prisma(args: string[], direct: string, shadow: string) {
  assertTestTarget(direct); assertTestTarget(shadow);
  const result = spawnSync(process.execPath, [resolveExecutable('prisma'), ...args], { env: { ...process.env, DIRECT_URL: scopedURL(direct,scope), SHADOW_DATABASE_URL: shadow, CORE_TEST_MIGRATIONS_PATH: `.cache/${scope}` }, encoding: 'utf8', timeout: 60_000 });
  // Print no connection URLs or raw migration stdout in assertion reports.
  expect(result.error?.message ?? null).toBeNull();
  const safeOutput = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '<connection-url>').slice(0, 5000);
  expect(result.status, `Prisma ${args.slice(0, 2).join(' ')} failed for ${scope}: ${safeOutput}`).toBe(0);
}

test('RNF-007 migration bloqueia estado desconhecido e GPS ausente sem alterar legado', async () => {
  scope = invalidSchema;
  const client = await connect(process.env.TEST_DATABASE_URL);
  try {
    await prepare(client,true);
    for (const scenario of [{status:'Novo',point:true}, {status:'Aberto',point:false}]) {
      await client.query('BEGIN');
      const inserted = await client.query(`INSERT INTO public.occurrences(type,status,location) VALUES ('fixture', $1, CASE WHEN $2 THEN ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography ELSE NULL END) RETURNING id`, [scenario.status,scenario.point]);
      await client.query('SAVEPOINT invalid_legacy');
      await expect(client.query(coreSQL)).rejects.toThrow('LEGACY_SANITATION_REQUIRED');
      await client.query('ROLLBACK TO SAVEPOINT invalid_legacy');
      const row = await client.query('SELECT status, location IS NULL AS missing FROM public.occurrences WHERE id=$1', [inserted.rows[0].id]);
      expect(row.rows).toEqual([{status:scenario.status,missing:!scenario.point}]);
      expect((await client.query("SELECT to_regclass('public.admin_profiles') AS core_table")).rows[0].core_table).toBeNull();
      await client.query('ROLLBACK');
    }
  } finally { await client.query('ROLLBACK').catch(() => undefined); await client.end(); }
});

test('RNF-007 Prisma baseline e expansão preservam registros IDs referências e bytes legados', async () => {
  scope = legacySchema;
  assertMigrationEnvironment();
  const client = await connect(process.env.TEST_DATABASE_URL);
  try {
    await prepare(client,true);
    const legacyTableNames = (await client.query('SELECT table_name FROM information_schema.tables WHERE table_schema=$1',[scope])).rows.map(row => row.table_name);
    expect(legacyTableNames, `baseline tables in ${scope}`).toContain('occurrences');
    const occurrenceIds: string[] = [];
    for (const status of ['Aberto','Em Atendimento','Resolvido','Recusado']) {
      occurrenceIds.push((await client.query("INSERT INTO public.occurrences(type,status,location,reporter_name,photo_url) VALUES ('fixture',$1,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326),'Pessoa sintética','fixture/photo.bin') RETURNING id",[status])).rows[0].id);
    }
    const shelter = (await client.query("INSERT INTO public.shelters(name,address,lat,lng) VALUES ('Abrigo sintético','Rua Teste, 1',-29.79,-50.52) RETURNING id")).rows[0].id;
    const resource = (await client.query("INSERT INTO public.resources(name,shelter_id) VALUES ('Recurso sintético',$1) RETURNING id",[shelter])).rows[0].id;
    await client.query("INSERT INTO public.resource_movements(resource_id,type,quantity) VALUES ($1,'entrada',1)",[resource]);
    await client.query("INSERT INTO public.shelter_people(shelter_id,full_name) VALUES ($1,'Pessoa sintética')",[shelter]);
    const team = (await client.query("INSERT INTO public.teams(name) VALUES ('Equipe sintética') RETURNING id")).rows[0].id;
    await client.query("INSERT INTO public.team_members(team_id,full_name) VALUES ($1,'Agente sintético')",[team]);
    await client.query('INSERT INTO public.team_locations(team_id,lat,lng,accuracy) VALUES ($1,-29.5,-50.5,10)',[team]);
    await client.query("INSERT INTO public.volunteers(full_name) VALUES ('Voluntário sintético')");
    await client.query("INSERT INTO storage.objects(bucket_id,name,metadata) VALUES ('occurrence_photos','fixture/photo.bin','{\"synthetic\":true}')");
    mkdirSync('.cache/fixtures',{recursive:true});
    const photoPath = '.cache/fixtures/legacy-photo.bin';
    writeFileSync(photoPath, Buffer.from('synthetic legacy file bytes'));
    const hash = () => createHash('sha256').update(readFileSync(photoPath)).digest('hex');
    const beforeHash = hash();
    const before: Record<string, unknown[]> = {};
    for (const table of [...legacyTables,'storage.objects']) {
      const name = table.includes('.') ? table : `public.${table}`;
      before[table] = (await client.query(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)).rows;
    }
    const beforeOccurrences = (await client.query('SELECT id,type,description,ST_AsEWKT(location::geometry) AS location,photo_url,reporter_name,assigned_to,created_at FROM public.occurrences ORDER BY id')).rows;
    prisma(['migrate','resolve','--applied','0_legacy'],process.env.TEST_DATABASE_URL!,process.env.SHADOW_DATABASE_URL!);
    prisma(['migrate','deploy'],process.env.TEST_DATABASE_URL!,process.env.SHADOW_DATABASE_URL!);
    for (const table of Object.keys(before)) {
      const name = table.includes('.') ? table : `public.${table}`;
      const afterRows = (await client.query(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)).rows;
      if (table === 'shelters') {
        expect(afterRows.map(({ row }) => { const preserved = { ...(row as Record<string, unknown>) }; delete preserved.is_active; return preserved; })).toEqual(before[table].map((entry) => (entry as { row: unknown }).row));
        expect((afterRows.find(({ row }) => (row as Record<string, unknown>).id === shelter)?.row as Record<string, unknown>).is_active).toBe(true);
      } else expect(afterRows).toEqual(before[table]);
    }
    const afterOccurrences = (await client.query(`SELECT id,type,description,ST_AsEWKT(location::geometry) AS location,photo_url,reporter_name,assigned_to,created_at,
      registering_institution_code,neighborhood_code,locality_code,occurrence_situation,damage_location_code,damage_location_detail,has_victims,has_displaced,
      registration_channel,location_source
      FROM public.occurrences ORDER BY id`)).rows;
    const triageFields=new Set(['registering_institution_code','neighborhood_code','locality_code','occurrence_situation','damage_location_code','damage_location_detail','has_victims','has_displaced','registration_channel','location_source']);
    expect(afterOccurrences.map(row=>Object.fromEntries(Object.entries(row).filter(([field])=>!triageFields.has(field))))).toEqual(beforeOccurrences);
    expect(afterOccurrences.every((row)=>[row.registering_institution_code,row.neighborhood_code,row.locality_code,row.occurrence_situation,row.damage_location_code,row.damage_location_detail,row.has_victims,row.has_displaced].every(value=>value===null))).toBe(true);
    expect(afterOccurrences.every(row=>row.registration_channel===null&&row.location_source===null)).toBe(true);
    expect(hash()).toBe(beforeHash);
    for (const [index,status] of ['NOVA','EM_ATENDIMENTO','RESOLVIDA','CANCELADA'].entries()) {
      const row = (await client.query('SELECT status,legacy_status,accuracy,needs_sanitation FROM public.occurrences WHERE id=$1',[occurrenceIds[index]])).rows[0];
      expect(row.status).toBe(status); expect(row.accuracy).toBeNull(); expect(row.needs_sanitation).toBe(true);
    }
    expect(Number((await client.query('SELECT count(*) FROM public.occurrence_private_data')).rows[0].count)).toBe(beforeOccurrences.length);
    expect((await client.query('SELECT migration_name FROM public._prisma_migrations WHERE finished_at IS NOT NULL ORDER BY migration_name')).rows.map((row) => row.migration_name)).toEqual(migrationNames);
  } finally { await client.end(); }
});

test('RNF-007 histórico Prisma reproduz baseline expansão e SQL complementar em banco vazio', async () => {
  scope = emptySchema;
  const client = await connect(process.env.SHADOW_DATABASE_URL);
  try {
    expect((await client.query("SELECT to_regclass('public.occurrences') AS legacy")).rows[0].legacy).toBeNull();
    await prepare(client,false);
    prisma(['migrate','deploy'],process.env.SHADOW_DATABASE_URL!,process.env.TEST_DATABASE_URL!);
    const tables = (await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")).rows.map((row) => row.table_name);
    expect(tables).toEqual(expect.arrayContaining(['occurrences',...legacyTables,'groups','admin_profiles','risk_zones','occurrence_events','occurrence_private_data','occurrence_alerts','audit_events','idempotency_keys','status_transitions','status_presentations','user_group_memberships','user_preferences','occurrence_classification_zones','occurrence_registering_institutions','occurrence_neighborhoods','occurrence_localities','occurrence_damage_locations','occurrence_service_agencies','occurrence_service_records']));
    expect((await client.query('SELECT count(*)::int AS count FROM public.occurrence_localities')).rows[0].count).toBe(50);
    expect((await client.query("SELECT column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='shelters' AND column_name='is_active'")).rows).toEqual([{column_default:'true',is_nullable:'NO'}]);
    expect((await client.query("SELECT pubname FROM pg_publication_tables WHERE tablename='occurrence_alerts' AND schemaname='public'")).rows).toEqual([{pubname:`${scope}_publication`}]);
    expect((await client.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.occurrence_private_data'::regclass")).rows[0].relrowsecurity).toBe(true);
    expect((await client.query("SELECT relrowsecurity FROM pg_class WHERE oid='public.occurrence_service_records'::regclass")).rows[0].relrowsecurity).toBe(true);
    expect((await client.query("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='idempotency_keys' AND policyname LIKE 'core_battalion_idempotency_%' ORDER BY policyname")).rows).toEqual([
      { policyname: 'core_battalion_idempotency_insert' }, { policyname: 'core_battalion_idempotency_read' },
    ]);
    expect((await client.query("SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='groups' AND policyname='core_default_group_lookup'")).rows).toEqual([{ policyname: 'core_default_group_lookup' }]);
    expect((await client.query("SELECT column_default,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name='shelters' AND column_name='is_active'")).rows).toEqual([{column_default:'true',is_nullable:'NO'}]);
    expect((await client.query("SELECT confdeltype FROM pg_constraint WHERE conrelid='public.shelter_people'::regclass AND conname='shelter_people_shelter_id_fkey'")).rows).toEqual([{confdeltype:'r'}]);
    await expect(client.query("INSERT INTO public.occurrences(type,protocol,group_id,location) SELECT 'fixture','missing-accuracy',id,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography FROM public.groups LIMIT 1")).rejects.toThrow('occurrences_native_accuracy');
    await expect(client.query("INSERT INTO public.occurrences(type,protocol,group_id,location,legacy_status) SELECT 'fixture','fake-legacy',id,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,'Aberto' FROM public.groups LIMIT 1")).rejects.toThrow('LEGACY_PROVENANCE_IMMUTABLE');
    await client.query(`INSERT INTO public.occurrences(type,protocol,group_id,location,accuracy,needs_medical_support,registration_channel,location_source)
      SELECT 'fixture','battalion-null-accuracy',id,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,NULL,true,'BATALHAO','MAPA'
      FROM public.groups WHERE is_default LIMIT 1`);
    await expect(client.query(`INSERT INTO public.occurrences(type,protocol,group_id,location,registration_channel,location_source)
      SELECT 'fixture','public-null-accuracy',id,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,'PUBLICO','GPS_NATIVO'
      FROM public.groups WHERE is_default LIMIT 1`)).rejects.toThrow('occurrences_native_accuracy');
    await expect(client.query(`INSERT INTO public.occurrences(type,protocol,group_id,location,accuracy,registration_channel,location_source)
      SELECT 'fixture','battalion-fake-accuracy',id,ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,8,'BATALHAO','MAPA'
      FROM public.groups WHERE is_default LIMIT 1`)).rejects.toThrow('occurrences_native_accuracy');
    expect((await client.query(`SELECT has_column_privilege('geoalerta_runtime','public.occurrences','registration_channel','INSERT') AS runtime_channel,
      has_column_privilege('geoalerta_runtime','public.occurrences','location_source','SELECT') AS runtime_location,
      has_column_privilege('geoalerta_ingest','public.occurrences','registration_channel','INSERT') AS ingest_channel`)).rows[0]).toEqual({runtime_channel:true,runtime_location:true,ingest_channel:true});
    const schema = (await client.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='occurrence_alerts'")).rows.map((row)=>row.column_name).sort();
    expect(schema).toEqual(['at','event_id','group_id','occurrence_id','priority','status']);
  } finally { await client.end(); }
});
