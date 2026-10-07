import { expect, test } from '@playwright/test';
import pg from 'pg';
import { accounts, groupA, occurrenceA, occurrenceB, occurrenceOther } from '../fixtures/access';
import { fixtureCookies } from '../fixtures/session';

const privateName = 'SENTINEL_CITIZEN_NAME_TICKET05';
const privateContact = 'SENTINEL_CITIZEN_CONTACT_TICKET05';
const privateReason = 'SENTINEL_PRIVATE_REASON_TICKET05';
const privateDiff = 'SENTINEL_PRIVATE_DIFF_TICKET05';
const oldZone = '90000000-0000-4000-8000-000000000001';
const occurrenceDeleted = '30000000-0000-4000-8000-000000000099';
const serviceRecordFixture = '92000000-0000-4000-8000-000000000011';

test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`DELETE FROM public.occurrence_service_records WHERE occurrence_id=$1 AND action=ANY($2::text[])`, [occurrenceA, ['Atendimento sintético para teste 1','Atendimento sintético para teste 2']]);
    await db.query('DELETE FROM public.occurrence_service_records WHERE id=$1', [serviceRecordFixture]);
    await db.query(`INSERT INTO public.occurrences(id,protocol,type,description,location,accuracy,group_id,deleted_at) VALUES ($1,'TEST-DELETED-TICKET05','fixture','deleted synthetic',ST_SetSRID(ST_MakePoint(-50.5,-29.5),4326)::geography,10,$2,now()) ON CONFLICT(id) DO NOTHING`, [occurrenceDeleted, groupA]);
    await db.query(`UPDATE public.occurrences SET reporter_name=$1,photo_url='SENTINEL_PRIVATE_PHOTO_TICKET05' WHERE id=$2`, [privateName, occurrenceA]);
    await db.query(`UPDATE public.occurrence_private_data SET reporter_name=$1,reporter_contact=$2,photo_object_key='core/92000000-0000-4000-8000-000000000011.jpg' WHERE occurrence_id=$3`, [privateName, privateContact, occurrenceA]);
    await db.query(`UPDATE public.occurrences SET registering_institution_code='CIDADAO',neighborhood_code='CENTRO',locality_code='PINHEIRINHOS_4D',occurrence_situation='EM_RISCO',damage_location_code='OUTROS',damage_location_detail='Margem do arroio',has_victims=NULL,has_displaced=false,needs_medical_support=false WHERE id=$1`, [occurrenceA]);
    const operator = accounts.find((account) => account.name === 'operador')!;
    await db.query('BEGIN');
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', ['request.jwt.claim.sub', operator.id, 'request.jwt.claims', JSON.stringify({ sub: operator.id })]);
    await db.query(`INSERT INTO public.occurrence_service_records(id,occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested) VALUES ($1,$2,'DEFESA_CIVIL','Agente da fixture','2026-10-02T15:30:00Z','Vistoria realizada','Local isolado',true) ON CONFLICT(id) DO NOTHING`, [serviceRecordFixture, occurrenceA]);
    await db.query('COMMIT');
    await db.query(`UPDATE public.occurrence_events SET reason=$1,changes=$2::jsonb WHERE occurrence_id=$3`, [privateReason, JSON.stringify({ private: privateDiff }), occurrenceA]);
    const polygon = "ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
    await db.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES ($1,1,'Zona histórica fixture','INUNDACAO',false,${polygon}),($1,2,'Zona atual fixture','INUNDACAO',true,${polygon}) ON CONFLICT(zone_id,version) DO UPDATE SET name=EXCLUDED.name,active=EXCLUDED.active`, [oldZone]);
    await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=$1', [occurrenceA]);
    await db.query(`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES ($1,$2,1) ON CONFLICT DO NOTHING`, [occurrenceA, oldZone]);
  } finally {
    await db.end();
  }
});

test.afterAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`DELETE FROM public.occurrence_service_records WHERE occurrence_id=$1 AND action=ANY($2::text[])`, [occurrenceA, ['Atendimento sintético para teste 1','Atendimento sintético para teste 2']]);
    await db.query('DELETE FROM public.occurrence_service_records WHERE id=$1', [serviceRecordFixture]);
  }
  finally { await db.end(); }
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
    protocol: expect.stringMatching(/^\d+$/),
    type: 'fixture',
    description: 'synthetic',
    status: { code: 'NOVA', label: 'Nova' },
    priority: 'NORMAL',
    group: { id: groupA, name: 'Fixture A' },
    position: { latitude: -29.5, longitude: -50.5, accuracy: 10 },
    version: 1,
    classification: { zones: [{ id: oldZone, name: 'Zona histórica fixture', version: 1 }] },
    occurrenceContext: {
      registeringInstitution: { code: 'CIDADAO', label: 'Cidadão' },
      neighborhood: { code: 'CENTRO', label: 'CENTRO' },
      locality: { code: 'PINHEIRINHOS_4D', label: 'PINHEIRINHOS - 4D' },
    },
    triage: {
      situation: 'EM_RISCO',
      damageLocation: { code: 'OUTROS', label: 'Outros', detail: 'Margem do arroio' },
      hasVictims: null,
      hasDisplaced: false,
      needsMedicalSupport: false,
    },
    privateData: { reporterName: privateName, reporterContact: privateContact, hasPhoto: true },
  });
  expect(detail.serviceRecords).toEqual(expect.arrayContaining([expect.objectContaining({
      id: serviceRecordFixture,
      agency: { code: 'DEFESA_CIVIL', label: 'DEFESA CIVIL' },
      attendingPerson: 'Agente da fixture',
      action: 'Vistoria realizada',
      outcome: 'Local isolado',
      reinforcementRequested: true,
      actorId: accounts.find((account) => account.name === 'operador')!.id,
      correctionOfId: null,
      correctionReason: null,
  })]));
  expect(new Date(detail.openedAt).toISOString()).toBeTruthy();
  expect(new Date(detail.updatedAt).toISOString()).toBeTruthy();
  expect(detail.events.length).toBeGreaterThan(0);
  expect(detail.events[0].kind).toBeTruthy();
  expect(detail.events[0].actorId).toBeNull();
  expect(detail.events[0].at).toBeTruthy();
  expect(detail.events.every((event: object) => Object.keys(event).sort().join(',') === 'actorId,at,id,kind')).toBe(true);
  expect(Object.keys(detail).sort()).toEqual(['actions', 'address', 'availableGroups', 'classification', 'description', 'events', 'group', 'id', 'occurrenceContext', 'openedAt', 'position', 'priority', 'privateData', 'protocol', 'serviceAgencyOptions', 'serviceRecords', 'status', 'triage', 'type', 'updatedAt', 'version']);
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
  expect(body).not.toContain('privateData');
  expect(body).not.toContain(privateName);
  expect(body).not.toContain(privateContact);
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

test('RF-015 Consulta vê apenas os campos técnicos dos registros de atendimento', async ({ request }) => {
  const response = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('consulta') });
  expect(response.status()).toBe(200);
  const detail = await response.json();
  expect(detail).not.toHaveProperty('privateData');
  expect(detail.serviceRecords).toEqual(expect.arrayContaining([expect.objectContaining({
    id: serviceRecordFixture,
    agency: { code: 'DEFESA_CIVIL', label: 'DEFESA CIVIL' },
    attendingPerson: 'Agente da fixture',
    action: 'Vistoria realizada',
  })]));
});

test('RF-018 somente operador autorizado cria atendimento e servidor define autor e horário', async ({ request }) => {
  const consultation = await request.post(`/api/core/occurrences/${occurrenceA}/service-records`, {
    headers: await headersFor('consulta'),
    data: { agencyCode: 'DEFESA_CIVIL', attendingPerson: 'Agente', attendedAt: '2026-10-02T15:30:00.000Z', action: 'Vistoria', outcome: null, reinforcementRequested: false },
  });
  expect(consultation.status()).toBe(403);

  const wrongGroup = await request.post(`/api/core/occurrences/${occurrenceB}/service-records`, {
    headers: await headersFor('operador'),
    data: { agencyCode: 'DEFESA_CIVIL', attendingPerson: 'Agente', attendedAt: '2026-10-02T15:30:00.000Z', action: 'Vistoria', outcome: null, reinforcementRequested: false },
  });
  expect(wrongGroup.status()).toBe(404);

  const before = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('operador') });
  const previous = await before.json();
  const response = await request.post(`/api/core/occurrences/${occurrenceA}/service-records`, {
    headers: await headersFor('operador'),
    data: { agencyCode: 'DEFESA_CIVIL', attendingPerson: 'Agente teste API', attendedAt: '2026-10-02T15:30:00.000Z', action: 'Atendimento sintético para teste 1', outcome: 'Teste concluído 1', reinforcementRequested: true },
  });
  expect(response.status()).toBe(201);
  const saved = await response.json();
  expect(saved.actorId).toBe(accounts.find((account) => account.name === 'operador')!.id);
  expect(saved.createdAt).toBeTruthy();
  expect(saved.attendedAt).toBe('2026-10-02T15:30:00.000Z');
  expect(saved).not.toHaveProperty('reason');

  const secondResponse = await request.post(`/api/core/occurrences/${occurrenceA}/service-records`, {
    headers: await headersFor('operador'),
    data: { agencyCode: 'BOMBEIROS_MILITAR', attendingPerson: 'Equipe de bombeiros teste', attendedAt: '2026-10-02T15:31:00.000Z', action: 'Atendimento sintético para teste 2', outcome: 'Teste concluído 2', reinforcementRequested: false },
  });
  expect(secondResponse.status()).toBe(201);
  const secondSaved = await secondResponse.json();
  expect(secondSaved.id).not.toBe(saved.id);
  const after = await request.get(`/api/core/occurrences/${occurrenceA}`, { headers: await headersFor('operador') });
  const current = await after.json();
  expect(current.serviceRecords).toHaveLength(previous.serviceRecords.length + 2);
  expect(current.serviceRecords.map((entry: { id: string }) => entry.id)).toContain(serviceRecordFixture);
  expect(current.serviceRecords.map((entry: { id: string }) => entry.id)).toContain(saved.id);
  expect(current.serviceRecords.map((entry: { id: string }) => entry.id)).toContain(secondSaved.id);
  expect(current.events.some((event: { kind: string }) => event.kind === 'SERVICE_ACTION_RECORDED')).toBe(true);
  expect(current.events.every((event: object) => !Object.hasOwn(event, 'action'))).toBe(true);
});

test('RF-018 não aceita campos de auditoria enviados pelo navegador', async ({ request }) => {
  const response = await request.post(`/api/core/occurrences/${occurrenceA}/service-records`, {
    headers: await headersFor('operador'),
    data: { agencyCode: 'DEFESA_CIVIL', attendingPerson: 'Agente teste', attendedAt: '2026-10-02T15:30:00.000Z', action: 'Vistoria', outcome: null, reinforcementRequested: false, actorId: '10000000-0000-4000-8000-000000000001' },
  });
  expect(response.status()).toBe(422);
});
