import { test, expect } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assertTestTarget } from '../fixtures/database';

test('adoção preserva zonas legadas e converte geometria sem colisão de chave primária', async () => {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const scope = `core_test_zone_adoption_${randomUUID().replaceAll('-', '')}`;
  const rewrite = (sql: string) => sql.replace(/\bpublic\./g, `${scope}.`).replaceAll("'public'", `'${scope}'`);
  const bridge = rewrite(readFileSync('prisma/migrations/202609300000_preserve_legacy_risk_zones/migration.sql', 'utf8'));
  const imported = rewrite(readFileSync('prisma/migrations/202610010018_import_legacy_risk_zones/migration.sql', 'utf8'));
  const zoneId = randomUUID();
  const geometry = { type: 'Polygon', coordinates: [[[-50.5, -29.5], [-50.4, -29.5], [-50.4, -29.4], [-50.5, -29.5]]] };
  try {
    await db.query(`CREATE SCHEMA ${scope}; SET search_path TO ${scope},public`);
    // Reproduce the observed deployed table, rather than the incomplete baseline.
    await db.query(bridge);
    await db.query(`ALTER TABLE ${scope}.legacy_risk_zones RENAME TO risk_zones;
      ALTER TABLE ${scope}.risk_zones RENAME CONSTRAINT legacy_risk_zones_pkey TO risk_zones_pkey`);
    // The first bridge created its restrictive policy; observed legacy did not.
    await db.query(`DROP POLICY core_legacy_zones_archived ON ${scope}.risk_zones`);
    await db.query(`INSERT INTO ${scope}.risk_zones(id,name,coordinates,geojson,municipio)
      VALUES($1,'Synthetic zone',$2,$3,'sa_patrulha')`, [zoneId, JSON.stringify(geometry.coordinates), JSON.stringify({ type: 'Feature', geometry, properties: {} })]);
    const before = (await db.query(`SELECT to_jsonb(z) AS record FROM ${scope}.risk_zones z`)).rows;
    await db.query(bridge);
    await db.query(`CREATE TABLE ${scope}.risk_zones (
      zone_id uuid, version integer, name text, type text, active boolean,
      geometry geometry(MultiPolygon,4326), PRIMARY KEY(zone_id,version));
      CREATE TABLE ${scope}.audit_events(entity_id uuid,kind text,changes jsonb)`);
    await db.query(imported);
    expect((await db.query(`SELECT to_jsonb(z) AS record FROM ${scope}.legacy_risk_zones z`)).rows).toEqual(before);
    expect((await db.query(`SELECT zone_id,version,active,GeometryType(geometry) AS type,
      ST_Equals(geometry,ST_GeomFromGeoJSON($1)) AS matches FROM ${scope}.risk_zones`, [JSON.stringify(geometry)])).rows)
      .toEqual([{ zone_id: zoneId, version: 1, active: true, type: 'MULTIPOLYGON', matches: true }]);
    expect((await db.query(`SELECT kind FROM ${scope}.audit_events`)).rows).toEqual([{ kind: 'LEGACY_RISK_ZONE_IMPORTED' }]);
    expect((await db.query(`SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass`, [`${scope}.legacy_risk_zones`])).rows[0].relrowsecurity).toBe(true);
    // Reject duplicates atomically, preserving both original and imported rows.
    await expect(db.query(imported)).rejects.toThrow('LEGACY_ZONE_ID_COLLISION');
    await db.query('ROLLBACK');
    expect(Number((await db.query(`SELECT count(*) FROM ${scope}.risk_zones`)).rows[0].count)).toBe(1);
  } finally {
    await db.query('ROLLBACK').catch(() => undefined);
    await db.end();
  }
});
