import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { accounts, groupA, groupB } from '../fixtures/access';
import { fixtureCookies } from '../fixtures/session';

const zoneId = '90000000-0000-4000-8000-000000000002';
const operatorId = accounts.find((account) => account.name === 'operador')!.id;
const cookieHeader = (cookies: { name: string; value: string }[]) => cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
const headersFor = async (name: string) => ({ Cookie: cookieHeader(await fixtureCookies(name)) });

async function database() {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  return db;
}

test.beforeAll(async () => {
  const db = await database();
  try {
    await db.query(`
      INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry)
      VALUES ($1,2,'Manual creation fixture','INUNDACAO',true,now()-interval '1 day',NULL,
        ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326)))
      ON CONFLICT(zone_id,version) DO UPDATE SET active=true,valid_from=now()-interval '1 day',valid_to=NULL
    `, [zoneId]);
  } finally {
    await db.end();
  }
});

test('US-05 criação manual exige sessão e valida GPS antes da persistência', async ({ request }) => {
  const missingGps = await request.post('/api/core/occurrences', {
    headers: { ...(await headersFor('operador')), 'Idempotency-Key': randomUUID() },
    data: { type: 'alagamento', description: 'Sem GPS', reporterName: 'Pessoa', reporterContact: '555-0100', groupId: groupA },
  });
  expect(missingGps.status()).toBe(422);

  const anonymous = await request.post('/api/core/occurrences', {
    headers: { 'Idempotency-Key': randomUUID() },
    data: { type: 'alagamento', description: 'Sem sessão', reporterName: 'Pessoa', reporterContact: '555-0100', groupId: groupA, position: { latitude: -29.5, longitude: -50.5, accuracy: 8 } },
  });
  expect(anonymous.status()).toBe(401);

  const consulta = await request.post('/api/core/occurrences', {
    headers: { ...(await headersFor('consulta')), 'Idempotency-Key': randomUUID() },
    data: { type: 'alagamento', description: 'Sem permissão', reporterName: 'Pessoa', reporterContact: '555-0100', groupId: groupA, position: { latitude: -29.5, longitude: -50.5, accuracy: 8 } },
  });
  expect(consulta.status()).toBe(403);
});

test('US-05 criação manual valida grupo, classifica a zona e grava ator e auditoria atomicamente', async ({ request }) => {
  const key = randomUUID();
  const input = {
    type: 'alagamento',
    description: 'Água avançando na via',
    reporterName: 'Pessoa sintética',
    reporterContact: '555-0101',
    address: 'Rua das Flores, 123',
    groupId: groupA,
    position: { latitude: -29.5, longitude: -50.5, accuracy: 8 },
  };
  const headers = { ...(await headersFor('operador')), 'Idempotency-Key': key };
  const created = await request.post('/api/core/occurrences', { headers, data: input });
  expect(created.status()).toBe(201);
  const result = await created.json();
  expect(result).toMatchObject({ status: 'NOVA', priority: 'ALTA', version: 1 });
  expect(result.protocol).toMatch(/^\d+$/);

  const db = await database();
  try {
    const occurrence = (await db.query(`
      SELECT o.protocol,o.status,o.priority,o.accuracy,o.address,o.group_id::text AS group_id,
        ST_Y(o.location::geometry)::float8 AS latitude,ST_X(o.location::geometry)::float8 AS longitude
      FROM public.occurrences o WHERE o.id=$1
    `, [result.id])).rows[0];
    expect(occurrence).toEqual({ protocol: result.protocol, status: 'NOVA', priority: 'ALTA', accuracy: 8, address: 'Rua das Flores, 123', group_id: groupA, latitude: -29.5, longitude: -50.5 });
    expect((await db.query('SELECT reporter_name,reporter_contact FROM public.occurrence_private_data WHERE occurrence_id=$1', [result.id])).rows[0]).toEqual({ reporter_name: input.reporterName, reporter_contact: input.reporterContact });
    const expectedZones = (await db.query(`
      SELECT z.zone_id::text AS zone_id,z.version AS zone_version FROM public.risk_zones z
      WHERE z.active AND (z.valid_from IS NULL OR z.valid_from <= now()) AND (z.valid_to IS NULL OR z.valid_to > now())
        AND z.version=(SELECT max(latest.version) FROM public.risk_zones latest WHERE latest.zone_id=z.zone_id)
        AND ST_Intersects(z.geometry,ST_SetSRID(ST_MakePoint($1,$2),4326))
      ORDER BY z.zone_id
    `, [input.position.longitude, input.position.latitude])).rows;
    expect(expectedZones).toContainEqual({ zone_id: zoneId, zone_version: 2 });
    expect((await db.query('SELECT zone_id::text AS zone_id,zone_version FROM public.occurrence_classification_zones WHERE occurrence_id=$1 ORDER BY zone_id', [result.id])).rows).toEqual(expectedZones);
    expect((await db.query("SELECT actor_id::text AS actor_id,kind FROM public.occurrence_events WHERE occurrence_id=$1", [result.id])).rows).toEqual([{ actor_id: operatorId, kind: 'OPENED' }]);
    expect((await db.query("SELECT actor_id::text AS actor_id,kind FROM public.audit_events WHERE entity_id=$1", [result.id])).rows).toEqual([{ actor_id: operatorId, kind: 'OPENED' }]);
    expect((await db.query('SELECT group_id::text AS group_id,priority,status FROM public.occurrence_alerts WHERE occurrence_id=$1', [result.id])).rows).toEqual([{ group_id: groupA, priority: 'ALTA', status: 'NOVA' }]);
  } finally {
    await db.end();
  }

  const replay = await request.post('/api/core/occurrences', { headers, data: input });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual(result);
  const conflict = await request.post('/api/core/occurrences', { headers, data: { ...input, description: 'Outro corpo' } });
  expect(conflict.status()).toBe(409);
});

test('RF-011 operador não pode escolher grupo fora do escopo nem criar parcialmente', async ({ request }) => {
  const response = await request.post('/api/core/occurrences', {
    headers: { ...(await headersFor('operador')), 'Idempotency-Key': randomUUID() },
    data: { type: 'alagamento', description: 'Fora do grupo', reporterName: 'Pessoa', reporterContact: '555-0100', groupId: groupB, position: { latitude: -29.5, longitude: -50.5, accuracy: 8 } },
  });
  expect(response.status()).toBe(403);
});
