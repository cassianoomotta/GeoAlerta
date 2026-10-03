import { expect, test } from '@playwright/test';
import pg from 'pg';
import { accounts, groupA, occurrenceA, occurrenceB } from '../fixtures/access';
import { assertTestTarget } from '../fixtures/database';

test('migration aditiva preserva ocorrências e publica os catálogos estruturados', async () => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    const tables = await db.query<{ table_name: string }>(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name=ANY($1::text[])
      ORDER BY table_name
    `, [[
      'occurrence_registering_institutions',
      'occurrence_neighborhoods',
      'occurrence_localities',
      'occurrence_damage_locations',
      'occurrence_service_agencies',
      'occurrence_service_records',
    ]]);
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      'occurrence_damage_locations',
      'occurrence_localities',
      'occurrence_neighborhoods',
      'occurrence_registering_institutions',
      'occurrence_service_agencies',
      'occurrence_service_records',
    ]);

    const columns = await db.query<{ column_name: string; is_nullable: string }>(`
      SELECT column_name,is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='occurrences'
        AND column_name=ANY($1::text[])
    `, [[
      'registering_institution_code', 'neighborhood_code', 'locality_code',
      'occurrence_situation', 'damage_location_code', 'damage_location_detail',
      'has_victims', 'has_displaced',
    ]]);
    expect(columns.rows).toHaveLength(8);
    expect(columns.rows.every((column) => column.is_nullable === 'YES')).toBe(true);

    const existing = await db.query<{ id: string; protocol: string; type: string; description: string | null }>(`
      SELECT id::text,protocol,type,description
      FROM public.occurrences WHERE id=ANY($1::uuid[]) ORDER BY id
    `, [[occurrenceA, occurrenceB]]);
    expect(existing.rows.every((row) => /^\d+$/.test(row.protocol))).toBe(true);
    expect(existing.rows).toEqual([
      { id: occurrenceA, protocol: existing.rows[0].protocol, type: 'fixture', description: 'synthetic' },
      { id: occurrenceB, protocol: existing.rows[1].protocol, type: 'fixture', description: 'synthetic' },
    ]);

    const seeds = await db.query<{ table_name: string; count: number }>(`
      SELECT table_name,count(*)::int AS count FROM (
        SELECT 'occurrence_registering_institutions' AS table_name FROM public.occurrence_registering_institutions
        UNION ALL SELECT 'occurrence_neighborhoods' FROM public.occurrence_neighborhoods
        UNION ALL SELECT 'occurrence_localities' FROM public.occurrence_localities
        UNION ALL SELECT 'occurrence_damage_locations' FROM public.occurrence_damage_locations
        UNION ALL SELECT 'occurrence_service_agencies' FROM public.occurrence_service_agencies
      ) catalogs GROUP BY table_name ORDER BY table_name
    `);
    expect(seeds.rows).toEqual([
      { table_name: 'occurrence_damage_locations', count: 17 },
      { table_name: 'occurrence_localities', count: 50 },
      { table_name: 'occurrence_neighborhoods', count: 12 },
      { table_name: 'occurrence_registering_institutions', count: 3 },
      { table_name: 'occurrence_service_agencies', count: 8 },
    ]);

    const security = await db.query<{ table_name: string; rls: boolean }>(`
      SELECT c.relname AS table_name,c.relrowsecurity AS rls
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=ANY($1::text[])
    `, [['occurrence_registering_institutions','occurrence_neighborhoods','occurrence_localities','occurrence_damage_locations','occurrence_service_agencies','occurrence_service_records']]);
    expect(security.rows).toHaveLength(6);
    expect(security.rows.every((row) => row.rls)).toBe(true);
    const grants = await db.query(`
      SELECT has_column_privilege('geoalerta_runtime','public.occurrences','registering_institution_code','SELECT') AS runtime_can_read_triage,
        has_column_privilege('geoalerta_runtime','public.occurrences','has_victims','SELECT') AS runtime_can_read_impacts,
        has_table_privilege('geoalerta_runtime','public.occurrence_service_records','SELECT') AS runtime_read,
        has_table_privilege('geoalerta_runtime','public.occurrence_service_records','INSERT') AS runtime_insert,
        has_column_privilege('geoalerta_runtime','public.occurrence_service_records','occurrence_id','INSERT') AS runtime_can_insert_occurrence,
        has_column_privilege('geoalerta_runtime','public.occurrence_service_records','actor_id','INSERT') AS runtime_can_set_actor,
        has_column_privilege('geoalerta_runtime','public.occurrence_service_records','created_at','INSERT') AS runtime_can_set_created_at,
        has_table_privilege('anon','public.occurrence_service_records','SELECT') AS anon_read,
        has_table_privilege('authenticated','public.occurrence_service_records','SELECT') AS authenticated_read
    `);
    expect(grants.rows[0]).toEqual({ runtime_can_read_triage: true, runtime_can_read_impacts: true, runtime_read: true, runtime_insert: false, runtime_can_insert_occurrence: true, runtime_can_set_actor: false, runtime_can_set_created_at: false, anon_read: false, authenticated_read: false });

    const indexes = await db.query<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes WHERE schemaname='public'
        AND indexname=ANY($1::text[]) ORDER BY indexname
    `, [['occurrences_registering_created','occurrences_neighborhood_created','occurrences_locality_created','occurrences_damage_location_created','occurrences_situation_created','occurrence_service_records_timeline','occurrence_service_records_agency']]);
    expect(indexes.rows.map((row) => row.indexname)).toEqual([
      'occurrence_service_records_agency', 'occurrence_service_records_timeline',
      'occurrences_damage_location_created', 'occurrences_locality_created',
      'occurrences_neighborhood_created', 'occurrences_registering_created',
      'occurrences_situation_created',
    ]);
    const occurrencePlan = await db.query<{ 'QUERY PLAN': string }>(`
      EXPLAIN (ANALYZE,BUFFERS)
      SELECT id FROM public.occurrences
      WHERE deleted_at IS NULL AND group_id=$1 AND neighborhood_code='CENTRO'
        AND created_at >= '2025-01-01T00:00:00Z' AND created_at < '2026-01-01T00:00:00Z'
      ORDER BY created_at DESC,id LIMIT 50
    `, [groupA]);
    expect(occurrencePlan.rows.map((row) => row['QUERY PLAN']).join('\n')).toMatch(/Execution Time:|actual time=/);
    const servicePlan = await db.query<{ 'QUERY PLAN': string }>(`
      EXPLAIN (ANALYZE,BUFFERS)
      SELECT id FROM public.occurrence_service_records
      WHERE agency_code='DEFESA_CIVIL' AND occurrence_id=$1 ORDER BY attended_at,id
    `, [occurrenceA]);
    expect(servicePlan.rows.map((row) => row['QUERY PLAN']).join('\n')).toMatch(/Execution Time:|actual time=/);
  } finally {
    await db.end();
  }
});

test('atendimentos respeitam grupo, actor/data do servidor e correção sem sobrescrever a linha original', async () => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.CORE_ACCESS_RUNTIME_URL });
  const operator = accounts.find((account) => account.name === 'operador')!;
  const consulta = accounts.find((account) => account.name === 'consulta')!;
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', [
      'request.jwt.claim.sub', operator.id,
      'request.jwt.claims', JSON.stringify({ sub: operator.id }),
    ]);

    const inserted = await db.query<{ id: string; actor_id: string; created_at: Date }>(`
      INSERT INTO public.occurrence_service_records(
        occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested
      ) VALUES ($1,'DEFESA_CIVIL','Agente sintético','2026-10-02T15:30:00Z','Ação sintética','Resultado sintético',true)
      RETURNING id::text,actor_id::text,created_at
    `, [occurrenceA]);
    const original = inserted.rows[0];
    expect(original.actor_id).toBe(operator.id);
    expect(original.created_at).toBeInstanceOf(Date);

    await db.query('SAVEPOINT spoofed_audit');
    await expect(db.query(`
      INSERT INTO public.occurrence_service_records(
        occurrence_id,agency_code,attending_person,attended_at,action,actor_id,created_at
      ) VALUES ($1,'DEFESA_CIVIL','Spoof','2026-10-02T15:30:00Z','Spoof',$2,'2000-01-01T00:00:00Z')
    `, [occurrenceA, consulta.id])).rejects.toMatchObject({ code: '42501' });
    await db.query('ROLLBACK TO SAVEPOINT spoofed_audit');

    const correction = await db.query<{ id: string }>(`
      INSERT INTO public.occurrence_service_records(
        occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested,correction_of_id,correction_reason
      ) VALUES ($1,'DEFESA_CIVIL','Agente sintético','2026-10-02T15:30:00Z','Ação corrigida','Resultado sintético',false,$2,'Correção de texto do registro')
      RETURNING id::text
    `, [occurrenceA, original.id]);
    const corrected = correction.rows[0];
    const records = await db.query<{ id: string; action: string; correction_of_id: string | null }>(`
      SELECT id::text,action,correction_of_id::text FROM public.occurrence_service_records
      WHERE id=ANY($1::uuid[]) ORDER BY created_at,id
    `, [[original.id, corrected.id]]);
    expect(records.rows).toContainEqual({ id: original.id, action: 'Ação sintética', correction_of_id: null });
    expect(records.rows).toContainEqual({ id: corrected.id, action: 'Ação corrigida', correction_of_id: original.id });

    await db.query('SAVEPOINT other_group_read');
    expect((await db.query('SELECT id FROM public.occurrence_service_records WHERE occurrence_id=$1', [occurrenceB])).rows).toEqual([]);
    await expect(db.query(`
      INSERT INTO public.occurrence_service_records(occurrence_id,agency_code,attending_person,attended_at,action)
      VALUES ($1,'DEFESA_CIVIL','Outro grupo','2026-10-02T15:30:00Z','Não autorizado')
    `, [occurrenceB])).rejects.toMatchObject({ code: '42501' });
    await db.query('ROLLBACK TO SAVEPOINT other_group_read');

    await db.query('SAVEPOINT append_only');
    await expect(db.query('UPDATE public.occurrence_service_records SET action=$1 WHERE id=$2', ['overwrite', original.id])).rejects.toMatchObject({ code: '42501' });
    await db.query('ROLLBACK TO SAVEPOINT append_only');

    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', [
      'request.jwt.claim.sub', consulta.id,
      'request.jwt.claims', JSON.stringify({ sub: consulta.id }),
    ]);
    const visible = await db.query<{ id: string }>('SELECT id::text FROM public.occurrence_service_records WHERE id=ANY($1::uuid[])', [[original.id, corrected.id]]);
    expect(visible.rows.map((row) => row.id).sort()).toEqual([original.id, corrected.id].sort());
    await db.query('SAVEPOINT consulta_cannot_insert');
    await expect(db.query(`
      INSERT INTO public.occurrence_service_records(occurrence_id,agency_code,attending_person,attended_at,action)
      VALUES ($1,'DEFESA_CIVIL','Consulta','2026-10-02T15:30:00Z','Não autorizado')
    `, [occurrenceA])).rejects.toMatchObject({ code: '42501' });
    await db.query('ROLLBACK TO SAVEPOINT consulta_cannot_insert');
    await db.query('ROLLBACK');
  } catch (error) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    await db.end();
  }
});
