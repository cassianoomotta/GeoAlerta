import { expect, test } from '@playwright/test';
import pg from 'pg';
import { assertTestTarget } from '../fixtures/database';

test('abrigos preservam dados, limitam leitura pública e bloqueiam exclusão com vínculo', async () => {
  const connectionString = process.env.TEST_DATABASE_URL;
  assertTestTarget(connectionString);
  const db = new pg.Client({ connectionString });
  await db.connect();

  try {
    await db.query('BEGIN');
    const activeRows = await db.query<{ is_active: boolean }>(`SELECT is_active FROM public.shelters LIMIT 0`);
    expect(activeRows.fields.map((field) => field.name)).toContain('is_active');

    const inserted = await db.query<{ id: string; name: string }>(`
      INSERT INTO public.shelters(municipio,name,type,address,lat,lng,status,is_active)
      VALUES
        ('sa_patrulha','TESTE abrigo aberto','humano','Rua Teste, 1',-29.79,-50.52,'Aberto',true),
        ('sa_patrulha','TESTE abrigo lotado','humano','Rua Teste, 2',-29.79,-50.52,'Lotado',true),
        ('sa_patrulha','TESTE abrigo inativo','humano','Rua Teste, 3',-29.79,-50.52,'Aberto',false),
        ('outro_municipio','TESTE outro município','humano','Rua Teste, 4',-29.79,-50.52,'Aberto',true)
      RETURNING id,name
    `);
    const openId = inserted.rows.find((row) => row.name === 'TESTE abrigo aberto')!.id;
    const linkedId = inserted.rows.find((row) => row.name === 'TESTE abrigo inativo')!.id;
    await db.query(`INSERT INTO public.shelter_people(shelter_id,full_name) VALUES($1,'Pessoa sintética')`, [linkedId]);

    await db.query('SAVEPOINT invalid_active_shelter');
    await expect(db.query(`INSERT INTO public.shelters(name,type) VALUES('TESTE sem endereço/GPS','humano')`)).rejects.toThrow();
    await db.query('ROLLBACK TO SAVEPOINT invalid_active_shelter');

    await db.query('SET LOCAL ROLE geoalerta_ingest');
    const publicRows = await db.query<{ id: string; name: string }>(`
      SELECT id,name FROM public.shelters WHERE is_active AND status='Aberto' AND municipio='sa_patrulha'
        AND name LIKE 'TESTE abrigo%'
    `);
    expect(publicRows.rows).toEqual([{ id: openId, name: 'TESTE abrigo aberto' }]);
    await db.query('SAVEPOINT people_read_denied');
    await expect(db.query('SELECT full_name FROM public.shelter_people')).rejects.toThrow();
    await db.query('ROLLBACK TO SAVEPOINT people_read_denied');

    await db.query('RESET ROLE');
    await db.query('SET LOCAL ROLE geoalerta_runtime');
    await db.query("SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',true)");
    expect((await db.query('SELECT id FROM public.shelters WHERE name LIKE $1', ['TESTE abrigo%'])).rows).toEqual([]);
    await db.query('SAVEPOINT non_admin_write');
    await expect(db.query(`INSERT INTO public.shelters(name,type,address,lat,lng) VALUES('TESTE sem permissão','humano','Rua Teste',-29.79,-50.52)`)).rejects.toThrow();
    await db.query('ROLLBACK TO SAVEPOINT non_admin_write');
    await db.query('RESET ROLE');

    await db.query('SET LOCAL ROLE geoalerta_runtime');
    await db.query("SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',true)");
    const adminInsert = await db.query<{ id: string }>(`INSERT INTO public.shelters(name,type,address,lat,lng) VALUES('TESTE criado por Admin','humano','Rua Teste, 5',-29.79,-50.52) RETURNING id`);
    expect((await db.query('SELECT is_active FROM public.shelters WHERE id=$1', [adminInsert.rows[0].id])).rows).toEqual([{ is_active: true }]);
    await db.query(`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES('10000000-0000-4000-8000-000000000004',$1,'ADMIN_SHELTER_CREATED','fixture','{}')`, [adminInsert.rows[0].id]);
    await db.query('RESET ROLE');

    await db.query('SAVEPOINT linked_delete');
    await expect(db.query('DELETE FROM public.shelters WHERE id=$1', [linkedId])).rejects.toThrow();
    await db.query('ROLLBACK TO SAVEPOINT linked_delete');
    expect(Number((await db.query('SELECT count(*) FROM public.shelter_people WHERE shelter_id=$1', [linkedId])).rows[0].count)).toBe(1);

    const foreignKey = await db.query<{ delete_action: string }>(`
      SELECT CASE confdeltype WHEN 'r' THEN 'RESTRICT' WHEN 'a' THEN 'NO ACTION' ELSE confdeltype::text END AS delete_action
      FROM pg_constraint WHERE conrelid='public.shelter_people'::regclass AND conname='shelter_people_shelter_id_fkey'
    `);
    expect(foreignKey.rows[0]?.delete_action).toBe('RESTRICT');

    const grants = await db.query<{ anon_select: boolean; authenticated_insert: boolean }>(`
      SELECT has_table_privilege('anon','public.shelters','SELECT') AS anon_select,
        has_table_privilege('authenticated','public.shelters','INSERT') AS authenticated_insert
    `);
    expect(grants.rows[0]).toEqual({ anon_select: false, authenticated_insert: false });

    const persisted = await db.query<{ count: string }>(`SELECT count(*) FROM public.shelters WHERE name LIKE 'TESTE abrigo%'`);
    expect(Number(persisted.rows[0].count)).toBe(3);
  } finally {
    await db.query('ROLLBACK').catch(() => undefined);
    await db.end();
  }
});
