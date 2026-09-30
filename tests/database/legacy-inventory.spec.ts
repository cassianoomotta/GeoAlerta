import { test, expect } from '@playwright/test';
import pg from 'pg';
import { assertTestTarget } from '../fixtures/database';

async function withReadOnlyDatabase<T>(check: (client: pg.Client) => Promise<T>) {
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  try {
    await client.connect();
    await client.query('BEGIN READ ONLY');
    return await check(client);
  } finally {
    if (client) { await client.query('ROLLBACK').catch(() => undefined); await client.end(); }
  }
}

test('RNF-007 alvo isolado possui PostGIS real e operações espaciais', async () => {
  await withReadOnlyDatabase(async (client) => {
    const result = await client.query('SELECT ST_SRID(ST_SetSRID(ST_MakePoint(-50.5, -29.5), 4326)) AS srid, ST_X(ST_MakePoint(-50.5, -29.5)) AS longitude');
    expect(result.rows[0]).toEqual({ srid: 4326, longitude: -50.5 });
  });
});

test('RNF-007 cópia legada observada está disponível antes de gerar baseline', async () => {
  await withReadOnlyDatabase(async (client) => {
    const required = ['occurrences', 'settings', 'resources', 'resource_movements', 'shelters', 'shelter_people', 'teams', 'team_members', 'team_locations', 'volunteers'];
    const result = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'");
    const observed = new Set(result.rows.map((row: { table_name: string }) => row.table_name));
    const missing = required.filter((name) => !observed.has(name));
    expect(missing, 'Cópia isolada do legado ausente; banco com somente PostGIS não permite observar a baseline GeoAlerta.').toEqual([]);
  });
});
