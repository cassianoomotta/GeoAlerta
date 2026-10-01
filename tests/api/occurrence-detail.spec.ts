import { expect, test } from '@playwright/test';
import pg from 'pg';
import { groupA, groupB, occurrenceA, occurrenceB, occurrenceOther } from '../fixtures/access';
import { fixtureCookies } from '../fixtures/session';

const privateName = 'SENTINEL_CITIZEN_NAME_TICKET05';
const privateContact = 'SENTINEL_CITIZEN_CONTACT_TICKET05';
const privateReason = 'SENTINEL_PRIVATE_REASON_TICKET05';
const privateDiff = 'SENTINEL_PRIVATE_DIFF_TICKET05';
const oldZone = '90000000-0000-4000-8000-000000000001';
const occurrenceDeleted = '30000000-0000-4000-8000-000000000099';

test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,group_id,deleted_at) VALUES ($1,'TEST-DELETED-TICKET05','fixture','deleted synthetic',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$2,now()) ON CONFLICT(id) DO UPDATE SET deleted_at=now()`, [occurrenceDeleted, groupA]);
    await db.query(`UPDATE public.occurrences SET reporter_name=$1,photo_url='SENTINEL_PRIVATE_PHOTO_TICKET05' WHERE id=$2`, [privateName, occurrenceA]);
    await db.query(`UPDATE public.occurrence_private_data SET reporter_name=$1,reporter_contact=$2,photo_object_key='SENTINEL_PRIVATE_OBJECT_TICKET05' WHERE occurrence_id=$3`, [privateName, privateContact, occurrenceA]);
    await db.query(`UPDATE public.occurrence_events SET reason=$1,changes=$2::jsonb WHERE occurrence_id=$3`, [privateReason, JSON.stringify({ private: privateDiff }), occurrenceA]);
    const polygon = "ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
    await db.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES ($1,1,'Zona histórica fixture','INUNDACAO',false,${polygon}),($1,2,'Zona atual fixture','INUNDACAO',true,${polygon}) ON CONFLICT(zone_id,version) DO UPDATE SET name=EXCLUDED.name,active=EXCLUDED.active`, [oldZone]);
    await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=$1', [occurrenceA]);
    await db.query(`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES ($1,$2,1) ON CONFLICT DO NOTHING`, [occurrenceA, oldZone]);
  } finally {
    await db.end();
  }
});

const cookieHeader = (cookies: { name: string; value: string }[]) => cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
const headersFor = async (name: string) => ({ Cookie: cookieHeader(await fixtureCookies(name)) });
const missingBody = { error: { code: 'NOT_FOUND', message: 'Registro não encontrado.' } };

test('RF-010 detalhe autorizado retorna os campos operacionais, posição, classificação e timeline', async ({ request }) => {
  const response = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('operador') });
  expect(response.status()).toBe(200);
  const detail = await response.json();
  expect(detail).toMatchObject({
    id: occurrenceA,
    protocol: `TEST-${occurrenceA}`,
    type: 'fixture',
    description: 'synthetic',
    status: { code: 'NOVA', label: 'Nova' },
    priority: 'NORMAL',
    group: { id: groupA, name: 'Fixture A' },
    position: { latitude: -29.5, longitude: -50.5, accuracy: 10 },
    version: 1,
    classification: { zones: [{ id: oldZone, name: 'Zona histórica fixture', version: 1 }] },
  });
  expect(new Date(detail.openedAt).toISOString()).toBeTruthy();
  expect(new Date(detail.updatedAt).toISOString()).toBeTruthy();
  expect(detail.events.length).toBeGreaterThan(0);
  expect(detail.events[0].kind).toBeTruthy();
  expect(detail.events[0].actorId).toBeNull();
  expect(detail.events[0].at).toBeTruthy();
  expect(detail.events.every((event: object) => Object.keys(event).sort().join(',') === 'actorId,at,id,kind')).toBe(true);
  expect(Object.keys(detail).sort()).toEqual(['classification', 'description', 'events', 'group', 'id', 'openedAt', 'position', 'priority', 'protocol', 'status', 'type', 'updatedAt', 'version']);
});

test('RF-010 detalhe inexistente e fora do escopo têm resposta indistinguível', async ({ request }) => {
  const headers = await headersFor('operador');
  for (const id of ['not-a-uuid', '30000000-0000-4000-8000-000000000098', occurrenceDeleted, occurrenceB, occurrenceOther]) {
    const response = await request.get(`/api/core/occurrences/${id}`, { headers });
    expect(response.status(), id).toBe(404);
    expect(await response.json(), id).toEqual(missingBody);
  }
});

test('RF-015 resposta de Consulta omite dados privados inclusive no histórico', async ({ request }) => {
  const response = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('consulta') });
  expect(response.status()).toBe(200);
  const body = JSON.stringify(await response.json());
  for (const sentinel of [privateName, privateContact, privateReason, privateDiff, 'SENTINEL_PRIVATE_PHOTO_TICKET05', 'SENTINEL_PRIVATE_OBJECT_TICKET05']) {
    expect(body).not.toContain(sentinel);
  }
  for (const field of ['reporter_name', 'reporter_contact', 'photo_url', 'photo_object_key', 'reason', 'changes']) {
    expect(body).not.toContain(field);
  }
});

test('RF-010 detalhe respeita grupos atribuídos e município', async ({ request }) => {
  const operator = await headersFor('operador');
  expect((await request.get(`/api/core/occurrences/${occurrenceB}`, { headers: operator })).status()).toBe(404);

  const manager = await headersFor('gestor');
  expect((await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: manager })).status()).toBe(200);
  expect((await request.get(`/api/core/occurrences/${occurrenceB}`, { headers: manager })).status()).toBe(200);

  const municipalityAdmin = await headersFor('admin');
  expect((await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: municipalityAdmin })).status()).toBe(200);
  expect((await request.get(`/api/core/occurrences/${occurrenceB}`, { headers: municipalityAdmin })).status()).toBe(200);

  expect((await request.get(`/api/core/occurrences/${occurrenceOther}`, { headers: municipalityAdmin })).status()).toBe(404);

  const otherMunicipalityAdmin = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('outromunicipio') });
  expect(otherMunicipalityAdmin.status()).not.toBe(200);
  expect(JSON.stringify(await otherMunicipalityAdmin.json())).not.toContain('synthetic');
});

test('RF-010 detalhe mostra versões classificadas na abertura', async ({ request }) => {
  const response = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('operador') });
  const detail = await response.json();
  expect(detail.classification.zones).toEqual([{ id: oldZone, name: 'Zona histórica fixture', version: 1 }]);
});
