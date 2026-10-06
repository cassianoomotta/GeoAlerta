import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { fixtureCookies } from '../fixtures/session';
import { accounts } from '../fixtures/access';

const offset = Math.random() * 0.4;
const longitude = -49.8 + offset;
const latitude = -29.8 + offset / 2;
const polygon = { type: 'Polygon', coordinates: [[[longitude,latitude],[longitude+0.01,latitude],[longitude+0.01,latitude+0.01],[longitude,latitude+0.01],[longitude,latitude]]] };
const otherPolygon = { type: 'Polygon', coordinates: [[[longitude+0.02,latitude],[longitude+0.03,latitude],[longitude+0.03,latitude+0.01],[longitude+0.02,latitude+0.01],[longitude+0.02,latitude]]] };
const cookiesFor = async (name: string) => (await fixtureCookies(name)).map(({ name, value }) => `${name}=${value}`).join('; ');
async function database() { const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL }); await db.connect(); return db; }

test('RF-003 administrador cria zona inativa e grava motivo, versões e auditoria atomicamente', async ({ request }) => {
  const headers = { Cookie: await cookiesFor('admin') };
  const input = { name: `Synthetic lifecycle ${randomUUID()}`, type: 'INUNDACAO', active: true, validFrom: null, validTo: null, geometry: polygon, reason: 'Cadastro inicial revisado' };
  const created = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'create', ...input } });
  expect(created.status()).toBe(201);
  const { zoneId } = await created.json();

  const db = await database();
  try {
    expect((await db.query('SELECT version,active FROM public.risk_zones WHERE zone_id=$1 ORDER BY version', [zoneId])).rows)
      .toEqual([{ version: 1, active: false }]);
expect((await db.query('SELECT actor_id::text AS actor_id,kind,reason FROM public.audit_events WHERE entity_id=$1 ORDER BY kind', [zoneId])).rows).toEqual([{ actor_id: accounts.find((account) => account.name === 'admin')!.id, kind: 'ADMIN_RISK_ZONE_CREATED', reason: 'Cadastro inicial revisado' }]);
  } finally { await db.end(); }

  const missingStart = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'update', zoneId, expectedVersion: 1, ...input, validFrom: null } });
  expect(missingStart.status()).toBe(400);
  const blankReason = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'update', zoneId, expectedVersion: 1, ...input, validFrom: '2026-10-01', reason: '   ' } });
  expect(blankReason.status()).toBe(400);

  const update = { action: 'update', zoneId, expectedVersion: 1, ...input, validFrom: '2026-10-01', active: true, reason: 'Ativação validada' };
  const activated = await request.post('/api/core/admin/risk-zones', { headers, data: update });
  expect(activated.status()).toBe(200);
  expect(await activated.json()).toMatchObject({ zoneId, version: 2 });
  expect((await request.post('/api/core/admin/risk-zones', { headers, data: update })).status()).toBe(409);
  const replacement = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'create', ...input, name: `Synthetic replacement ${randomUUID()}`, geometry: otherPolygon, replacesZoneId: zoneId, reason: 'Substituição aprovada' } });
  expect(replacement.status()).toBe(201);
  const { zoneId: replacementId } = await replacement.json();
  const replacementDb = await database();
  try {
    const audit = await replacementDb.query("SELECT changes->>'replacesZoneId' AS replaces_zone_id FROM public.audit_events WHERE entity_id=$1", [replacementId]);
    expect(audit.rows).toEqual([{ replaces_zone_id: zoneId }]);
  } finally { await replacementDb.end(); }
  const missingReplacement = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'create', ...input, replacesZoneId: randomUUID() } });
  expect(missingReplacement.status()).toBe(404);
});

test('RF-003 snapshots históricos selecionam a versão efetiva e comparam dois instantes', async ({ request }) => {
  const headers = { Cookie: await cookiesFor('admin') };
  const historyPolygon = { type: 'Polygon', coordinates: [[[longitude + 0.05,latitude],[longitude + 0.06,latitude],[longitude + 0.06,latitude + 0.01],[longitude + 0.05,latitude + 0.01],[longitude + 0.05,latitude]]] };
  const input = { action: 'create', name: `Synthetic history ${randomUUID()}`, type: 'INUNDACAO', active: false, validFrom: null, validTo: null, geometry: historyPolygon, reason: 'Cadastro histórico' };
  const created = await request.post('/api/core/admin/risk-zones', { headers, data: input });
  expect(created.status()).toBe(201);
  const { zoneId } = await created.json();
  const version2 = await request.post('/api/core/admin/risk-zones', { headers, data: { ...input, action: 'update', zoneId, expectedVersion: 1, active: true, validFrom: '2026-10-15T00:00:00.000Z', reason: 'Ativação agendada' } });
  expect(version2.status()).toBe(200);
  const version3 = await request.post('/api/core/admin/risk-zones', { headers, data: { ...input, action: 'update', zoneId, expectedVersion: 2, active: false, validFrom: '2026-11-01T00:00:00.000Z', reason: 'Encerramento agendado' } });
  expect(version3.status()).toBe(200);

  const earlier = await request.get('/api/core/admin/risk-zones?at=2026-10-10T00%3A00%3A00.000Z', { headers });
  expect(earlier.status()).toBe(200);
  expect((await earlier.json()).snapshot.zones).not.toContainEqual(expect.objectContaining({ zoneId }));
  const compared = await request.get('/api/core/admin/risk-zones?at=2026-10-20T00%3A00%3A00.000Z&compareAt=2026-11-02T00%3A00%3A00.000Z', { headers });
  expect(compared.status()).toBe(200);
  const snapshots = (await compared.json()).snapshots;
  expect(snapshots[0]).toEqual(expect.objectContaining({ at: '2026-10-20T00:00:00.000Z', zones: expect.arrayContaining([expect.objectContaining({ zoneId, version: 2, active: true })]) }));
  expect(snapshots[1]).toEqual(expect.objectContaining({ at: '2026-11-02T00:00:00.000Z' }));
  expect(snapshots[1].zones).not.toContainEqual(expect.objectContaining({ zoneId }));
  expect((await request.get('/api/core/admin/risk-zones?at=ontem', { headers })).status()).toBe(400);
  expect((await request.get('/api/core/admin/risk-zones?at=2026-02-30T00%3A00%3A00Z', { headers })).status()).toBe(400);
  expect((await request.get('/api/core/admin/risk-zones?at=2026-10-20T00%3A00%3A00.000Z')).status()).toBe(401);
  expect((await request.get('/api/core/admin/risk-zones?at=2026-10-20T00%3A00%3A00.000Z', { headers: { Cookie: await cookiesFor('operador') } })).status()).toBe(403);
});

test('RF-003 duplicidade exata exige justificativa, registra exceção e preserva sobreposição parcial', async ({ request }) => {
  const headers = { Cookie: await cookiesFor('admin') };
  const first = await request.post('/api/core/admin/risk-zones', { headers, data: { action: 'create', name: `Synthetic duplicate ${randomUUID()}`, type: 'RISCO', active: false, validFrom: null, validTo: null, geometry: polygon, reason: 'Cadastro independente' } });
  expect(first.status()).toBe(201);
  const duplicate = { action: 'create', name: `Synthetic duplicate override ${randomUUID()}`, type: 'RISCO', active: false, validFrom: null, validTo: null, geometry: polygon, reason: 'Novo cadastro' };
  const refused = await request.post('/api/core/admin/risk-zones', { headers, data: duplicate });
  expect(refused.status()).toBe(409);
  expect(await refused.json()).toMatchObject({ error: { code: 'RISK_ZONE_DUPLICATE' } });
  const accepted = await request.post('/api/core/admin/risk-zones', { headers, data: { ...duplicate, duplicateOverrideReason: 'Levantamento confirma duas zonas distintas' } });
  expect(accepted.status()).toBe(201);
  const { zoneId } = await accepted.json();
  const db = await database();
  try {
    const audit = await db.query('SELECT reason,changes->>\'duplicateOverrideReason\' AS duplicate_reason FROM public.audit_events WHERE entity_id=$1', [zoneId]);
    expect(audit.rows).toEqual([{ reason: 'Novo cadastro', duplicate_reason: 'Levantamento confirma duas zonas distintas' }]);
    const partial = await request.post('/api/core/admin/risk-zones', { headers, data: { ...duplicate, name: `Synthetic partial ${randomUUID()}`, geometry: otherPolygon } });
    expect(partial.status()).toBe(201);
  } finally { await db.end(); }
});

test('RF-003 operações de zona continuam restritas a administradores', async ({ request }) => {
  const body = { action: 'create', name: `Synthetic denied ${randomUUID()}`, type: 'INUNDACAO', active: false, validFrom: null, validTo: null, geometry: polygon, reason: 'Teste de autorização' };
  expect((await request.post('/api/core/admin/risk-zones', { data: body })).status()).toBe(401);
  expect((await request.post('/api/core/admin/risk-zones', { headers: { Cookie: await cookiesFor('operador') }, data: body })).status()).toBe(403);
});
