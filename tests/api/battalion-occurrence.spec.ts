import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { fixtureCookies } from '../fixtures/session';

const zoneId = '90000000-0000-4000-8000-000000000037';
const adminId = '10000000-0000-4000-8000-000000000004';
const operatorId = '10000000-0000-4000-8000-000000000002';
const cookieHeader = (cookies: { name: string; value: string }[]) => cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
const headersFor = async (name: string) => ({ Cookie: cookieHeader(await fixtureCookies(name)) });
const createdOccurrences: string[] = [];
const idempotencyKeys: string[] = [];
const createdEvents: string[] = [];
let operatorDefaultGroupId: string | null = null;
let addedOperatorDefaultMembership = false;

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
      VALUES ($1,1,'Battalion flow fixture','INUNDACAO',true,now()-interval '1 day',NULL,
        ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326)))
      ON CONFLICT(zone_id,version) DO UPDATE SET active=true,valid_from=now()-interval '1 day',valid_to=NULL
    `, [zoneId]);
    operatorDefaultGroupId = (await db.query("SELECT id::text AS id FROM public.groups WHERE municipality_id='sa_patrulha' AND is_default")).rows[0]?.id ?? null;
    if (operatorDefaultGroupId) {
      const membership = await db.query('SELECT 1 FROM public.user_group_memberships WHERE user_id=$1 AND group_id=$2', [operatorId, operatorDefaultGroupId]);
      if (!membership.rowCount) {
        await db.query('INSERT INTO public.user_group_memberships(user_id,group_id) VALUES($1,$2)', [operatorId, operatorDefaultGroupId]);
        addedOperatorDefaultMembership = true;
      }
    }
  } finally { await db.end(); }
});

test.afterAll(async () => {
  const db = await database();
  try {
    if (createdOccurrences.length) {
      await db.query('DELETE FROM public.occurrence_alerts WHERE occurrence_id=ANY($1::uuid[])', [createdOccurrences]);
      await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=ANY($1::uuid[])', [createdOccurrences]);
      await db.query('DELETE FROM public.occurrence_events WHERE occurrence_id=ANY($1::uuid[])', [createdOccurrences]);
      await db.query('DELETE FROM public.occurrence_private_data WHERE occurrence_id=ANY($1::uuid[])', [createdOccurrences]);
      await db.query('DELETE FROM public.idempotency_keys WHERE key=ANY($1::text[])', [idempotencyKeys]);
      await db.query('DELETE FROM public.audit_events WHERE entity_id=ANY($1::uuid[])', [createdOccurrences]);
      await db.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])', [createdOccurrences]);
    }
    if (createdEvents.length) await db.query('DELETE FROM public.climate_events WHERE id=ANY($1::uuid[])', [createdEvents]);
    await db.query('DELETE FROM public.risk_zones WHERE zone_id=$1', [zoneId]);
    if (addedOperatorDefaultMembership && operatorDefaultGroupId) {
      await db.query('DELETE FROM public.user_group_memberships WHERE user_id=$1 AND group_id=$2', [operatorId, operatorDefaultGroupId]);
    }
  } finally { await db.end(); }
});

test('Task 37 API exige sessão, permissão, ponto confirmado e recusa campos derivados', async ({ request }) => {
  const input = {
    type: 'Alagamentos/Inundação', address: 'Rua das Flores, 123', description: 'Água avançando na via',
    needsMedicalSupport: false, position: { latitude: -29.5, longitude: -50.5, confirmed: true },
  };
  const anonymous = await request.post('/api/core/occurrences/battalion', { headers: { 'Idempotency-Key': randomUUID() }, data: input });
  expect(anonymous.status()).toBe(401);
  const consulta = await request.post('/api/core/occurrences/battalion', {
    headers: { ...(await headersFor('consulta')), 'Idempotency-Key': randomUUID() }, data: input,
  });
  expect(consulta.status()).toBe(403);
  for (const profile of ['gestor', 'suspenso', 'semgrupo']) {
    const denied = await request.post('/api/core/occurrences/battalion', {
      headers: { ...(await headersFor(profile)), 'Idempotency-Key': randomUUID() }, data: input,
    });
    expect(denied.status(), `perfil ${profile}`).toBe(403);
  }
  const unconfirmed = await request.post('/api/core/occurrences/battalion', {
    headers: { ...(await headersFor('admin')), 'Idempotency-Key': randomUUID() }, data: { ...input, position: { ...input.position, confirmed: false } },
  });
  expect(unconfirmed.status()).toBe(422);
  const derived = await request.post('/api/core/occurrences/battalion', {
    headers: { ...(await headersFor('admin')), 'Idempotency-Key': randomUUID() }, data: { ...input, priority: 'NORMAL' },
  });
  expect(derived.status()).toBe(422);
});

test('Task 37 registra no padrão, classifica, grava contato privado, evento ativo e replay estável', async ({ request }) => {
  const headers = await headersFor('admin');
  const privilegeDb = await database();
  try {
    const privileges = (await privilegeDb.query(`
      SELECT has_column_privilege('geoalerta_runtime','public.occurrences','needs_medical_support','INSERT') AS medical,
        has_column_privilege('geoalerta_runtime','public.occurrences','registration_channel','INSERT') AS channel,
        has_column_privilege('geoalerta_runtime','public.occurrences','location_source','INSERT') AS location_source,
        has_table_privilege('geoalerta_runtime','public.occurrence_private_data','INSERT') AS private_data,
        has_table_privilege('geoalerta_runtime','public.occurrence_events','INSERT') AS occurrence_events,
        has_table_privilege('geoalerta_runtime','public.audit_events','INSERT') AS audit_events,
        has_table_privilege('geoalerta_runtime','public.occurrence_alerts','INSERT') AS alerts,
        has_table_privilege('geoalerta_runtime','public.idempotency_keys','INSERT') AS idempotency
    `)).rows[0];
    expect(privileges).toEqual({ medical: true, channel: true, location_source: true, private_data: true, occurrence_events: true, audit_events: true, alerts: true, idempotency: true });
  } finally { await privilegeDb.end(); }
  const suffix = randomUUID().slice(0, 8);
  const eventCreated = await request.post('/api/core/climate-events', {
    headers, data: { action: 'create', name: `Evento batalhão ${suffix}`, plannedStart: '2026-10-07', plannedEnd: '2026-10-09' },
  });
  expect(eventCreated.status()).toBe(201);
  const event = await eventCreated.json();
  createdEvents.push(event.id);
  const started = await request.post('/api/core/climate-events', { headers, data: { action: 'start', id: event.id, expectedVersion: event.version } });
  expect(started.status()).toBe(200);
  const active = await started.json();

  const idempotencyKey = randomUUID();
  const databaseKey = `battalion:${operatorId}:${idempotencyKey}`;
  idempotencyKeys.push(databaseKey);
  const input = {
    type: 'Alagamentos/Inundação', address: 'Rua das Flores, 123', description: `Água avançando ${suffix}`,
    needsMedicalSupport: true, reporterName: '', reporterContact: '555-0101',
    position: { latitude: -29.5, longitude: -50.5, confirmed: true },
  };
  const operatorHeaders = await headersFor('operador');
  const first = await request.post('/api/core/occurrences/battalion', { headers: { ...operatorHeaders, 'Idempotency-Key': idempotencyKey }, data: input });
  expect(first.status()).toBe(201);
  const result = await first.json();
  createdOccurrences.push(result.id);
  expect(result).toMatchObject({ protocol: expect.stringMatching(/^\d+$/), status: 'NOVA', priority: 'ALTA' });
  const detail = await request.get(`/api/core/occurrences/${result.id}`, { headers });
  expect(detail.status()).toBe(200);
  expect(await detail.json()).toMatchObject({ registrationChannel: 'BATALHAO', locationSource: 'MAPA', triage: { needsMedicalSupport: true }, climateEvent: { id: event.id } });
  const list = await request.get(`/api/core/occurrences?climateEventId=${event.id}&page=1&pageSize=10`, { headers });
  expect(list.status()).toBe(200);
  expect((await list.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({ id: result.id, climateEventId: event.id })]));

  const db = await database();
  try {
    const occurrence = (await db.query(`
      SELECT o.group_id::text AS group_id,g.is_default,o.climate_event_id::text AS climate_event_id,
        o.registration_channel,o.location_source,o.accuracy,o.needs_medical_support,
        ST_Y(o.location::geometry)::float8 AS latitude,ST_X(o.location::geometry)::float8 AS longitude
      FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id WHERE o.id=$1
    `, [result.id])).rows[0];
    expect(occurrence).toEqual({ group_id: expect.any(String), is_default: true, climate_event_id: event.id,
      registration_channel: 'BATALHAO', location_source: 'MAPA', accuracy: null, needs_medical_support: true, latitude: -29.5, longitude: -50.5 });
    expect((await db.query('SELECT reporter_name,reporter_contact FROM public.occurrence_private_data WHERE occurrence_id=$1', [result.id])).rows[0]).toEqual({ reporter_name: null, reporter_contact: '555-0101' });
    expect((await db.query('SELECT zone_id::text AS zone_id,zone_version FROM public.occurrence_classification_zones WHERE occurrence_id=$1', [result.id])).rows).toContainEqual({ zone_id: zoneId, zone_version: 1 });
    expect((await db.query('SELECT actor_id::text AS actor_id,kind FROM public.occurrence_events WHERE occurrence_id=$1', [result.id])).rows).toEqual([{ actor_id: operatorId, kind: 'OPENED' }]);
    expect((await db.query("SELECT actor_id::text AS actor_id,kind FROM public.audit_events WHERE entity_id=$1", [result.id])).rows).toEqual([{ actor_id: operatorId, kind: 'OPENED' }]);
    expect((await db.query('SELECT group_id::text AS group_id,priority,status FROM public.occurrence_alerts WHERE occurrence_id=$1', [result.id])).rows).toEqual([{ group_id: occurrence.group_id, priority: 'ALTA', status: 'NOVA' }]);
  } finally { await db.end(); }

  let occurrenceVersion = 1;
  for (const target of ['EM_TRIAGEM', 'EM_ATENDIMENTO', 'RESOLVIDA']) {
    const occurrenceClosed = await request.patch(`/api/core/occurrences/${result.id}`, {
      headers, data: { expectedVersion: occurrenceVersion, command: { kind: 'transition', target } },
    });
    expect(occurrenceClosed.status()).toBe(200);
    occurrenceVersion++;
  }
  const closed = await request.post('/api/core/climate-events', { headers, data: { action: 'close', id: event.id, expectedVersion: active.version } });
  expect(closed.status()).toBe(200);
  const replay = await request.post('/api/core/occurrences/battalion', { headers: { ...operatorHeaders, 'Idempotency-Key': idempotencyKey }, data: input });
  expect(replay.status()).toBe(200);
  expect(await replay.json()).toEqual(result);
  const conflict = await request.post('/api/core/occurrences/battalion', {
    headers: { ...operatorHeaders, 'Idempotency-Key': idempotencyKey }, data: { ...input, description: 'Payload alterado' },
  });
  expect(conflict.status()).toBe(409);
});

test('Task 37 aceita ocorrência sem nome/contato e sem evento climático ativo', async ({ request }) => {
  const idempotencyKey = randomUUID();
  idempotencyKeys.push(`battalion:${adminId}:${idempotencyKey}`);
  const created = await request.post('/api/core/occurrences/battalion', {
    headers: { ...(await headersFor('admin')), 'Idempotency-Key': idempotencyKey },
    data: { type: 'Buracos', address: 'Rua de referência, 2', description: 'Buraco na pista', needsMedicalSupport: false,
      position: { latitude: 10, longitude: 10, confirmed: true } },
  });
  expect(created.status()).toBe(201);
  const result = await created.json();
  createdOccurrences.push(result.id);
  const db = await database();
  try {
    expect((await db.query('SELECT climate_event_id,accuracy,needs_medical_support FROM public.occurrences WHERE id=$1', [result.id])).rows[0]).toEqual({ climate_event_id: null, accuracy: null, needs_medical_support: false });
    expect((await db.query('SELECT reporter_name,reporter_contact FROM public.occurrence_private_data WHERE occurrence_id=$1', [result.id])).rows[0]).toEqual({ reporter_name: null, reporter_contact: null });
  } finally { await db.end(); }
});
