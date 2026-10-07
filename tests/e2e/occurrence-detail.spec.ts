import { expect, test } from '@playwright/test';
import pg from 'pg';
import { occurrenceA, occurrenceB } from '../fixtures/access';
import { fixtureCookies } from '../fixtures/session';

const privateName = 'SENTINEL_CITIZEN_NAME_TICKET05';
const privateContact = 'SENTINEL_CITIZEN_CONTACT_TICKET05';
const privateReason = 'SENTINEL_PRIVATE_REASON_TICKET05';
const privateDiff = 'SENTINEL_PRIVATE_DIFF_TICKET05';
const orderedEventOne = '90000000-0000-4000-8000-000000000011';
const orderedEventTwo = '90000000-0000-4000-8000-000000000012';
const serviceRecordFixture = '92000000-0000-4000-8000-000000000021';
let browserRequests: string[] = [];
let fixtureProtocol = '';

test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`DELETE FROM public.occurrence_service_records WHERE attending_person='Agente de atendimento E2E'`);
    const zoneId = '90000000-0000-4000-8000-000000000001';
    await db.query('DELETE FROM public.occurrence_service_records WHERE id=$1', [serviceRecordFixture]);
    const polygon = "ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
    await db.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES ($1,1,'Zona histórica fixture','INUNDACAO',false,${polygon}),($1,2,'Zona atual fixture','INUNDACAO',true,${polygon}) ON CONFLICT(zone_id,version) DO UPDATE SET name=EXCLUDED.name,active=EXCLUDED.active`, [zoneId]);
    await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=$1', [occurrenceA]);
    await db.query(`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES ($1,$2,1) ON CONFLICT DO NOTHING`, [occurrenceA, zoneId]);
    await db.query(`UPDATE public.occurrences SET reporter_name=$1,photo_url='SENTINEL_PRIVATE_PHOTO_TICKET05' WHERE id=$2`, [privateName, occurrenceA]);
    await db.query(`UPDATE public.occurrence_private_data SET reporter_name=$1,reporter_contact=$2,photo_object_key='core/92000000-0000-4000-8000-000000000021.jpg' WHERE occurrence_id=$3`, [privateName, privateContact, occurrenceA]);
    await db.query(`UPDATE public.occurrences SET registering_institution_code='CIDADAO',neighborhood_code='CENTRO',locality_code='PINHEIRINHOS_4D',occurrence_situation='EM_RISCO',damage_location_code='OUTROS',damage_location_detail='Margem do arroio',has_victims=NULL,has_displaced=false,needs_medical_support=true WHERE id=$1`, [occurrenceA]);
    fixtureProtocol=(await db.query<{protocol:string}>('SELECT protocol FROM public.occurrences WHERE id=$1',[occurrenceA])).rows[0].protocol;
    const operatorId='10000000-0000-4000-8000-000000000002';
    await db.query('BEGIN');
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)', ['request.jwt.claim.sub',operatorId,'request.jwt.claims',JSON.stringify({sub:operatorId})]);
    await db.query(`INSERT INTO public.occurrence_service_records(id,occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested) VALUES($1,$2,'DEFESA_CIVIL','Agente da fixture','2026-10-02T15:30:00Z','Vistoria realizada','Local isolado',true) ON CONFLICT(id) DO NOTHING`,[serviceRecordFixture,occurrenceA]);
    await db.query('COMMIT');
    await db.query(`INSERT INTO public.occurrence_events(id,occurrence_id,kind,at,reason,changes) VALUES ($1,$3,'abertura fixture','2020-01-01T00:00:00Z',$4,$5::jsonb),($2,$3,'classificação fixture','2020-01-02T00:00:00Z',$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,at=EXCLUDED.at,reason=EXCLUDED.reason,changes=EXCLUDED.changes`, [orderedEventOne, orderedEventTwo, occurrenceA, privateReason, JSON.stringify({ private: privateDiff })]);
  } finally {
    await db.end();
  }
});

test.afterAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    await db.query(`DELETE FROM public.occurrence_service_records WHERE attending_person='Agente de atendimento E2E'`);
    await db.query('DELETE FROM public.occurrence_service_records WHERE id=$1', [serviceRecordFixture]);
  }
  finally { await db.end(); }
});

test.beforeEach(async ({ page, context }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
  });
  browserRequests = [];
  page.on('request', (request) => browserRequests.push(request.url()));
  await context.addCookies((await fixtureCookies('operador')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
});

test('RF-010 detalhe apresenta protocolo, classificação, localização e histórico', async ({ page }) => {
  await page.goto(`/painel/ocorrencias/${occurrenceA}`);

  await expect(page.getByRole('heading', { name: 'Detalhe da ocorrência' })).toBeVisible();
  await expect(page.getByText(`Protocolo ${fixtureProtocol}`)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Informações do cidadão' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Informações da ocorrência' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Impactos e triagem' })).toBeVisible();
  await expect(page.getByText('Apoio médico', {exact:true}).locator('..')).toContainText('Sim');
  await expect(page.getByRole('heading', { name: 'Atendimento e ações' })).toBeVisible();
  await expect(page.getByText(privateName)).toBeVisible();
  await expect(page.getByText('Margem do arroio')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Registros de atendimento' }).getByText('Vistoria realizada').first()).toBeVisible();
  await expect(page.getByText('Zona histórica fixture')).toBeVisible();
  await expect(page.getByText('Versão 1', { exact: true })).toBeVisible();
  await expect(page.getByText(/Latitude: -29,5/)).toBeVisible();
  await expect(page.getByText(/Longitude: -50,5/)).toBeVisible();
  await expect(page.getByText('Precisão: 10 m')).toBeVisible();
  const timeline = page.getByRole('list', { name: 'Histórico' });
  const items = timeline.getByRole('listitem');
  await expect(items).not.toHaveCount(0);
  const texts = await items.allInnerTexts();
  expect(texts.findIndex((text) => text.includes('abertura fixture'))).toBeLessThan(texts.findIndex((text) => text.includes('classificação fixture')));
  expect(browserRequests.some((url) => url.includes('/rest/v1/occurrences'))).toBe(false);
});

test('RF-018 operador registra atendimento e formulário fica pronto para novo registro', async ({ page }) => {
  await page.goto(`/painel/ocorrencias/${occurrenceA}`);
  const form = page.getByRole('form', { name: 'Registrar ação de atendimento' });
  await expect(form).toBeVisible();
  await form.getByLabel(/Órgão responsável/).selectOption('DEFESA_CIVIL');
  await form.getByLabel(/Agente ou responsável/).fill('Agente de atendimento E2E');
  await form.getByLabel(/Data e hora do atendimento/).fill('2026-10-02T15:30');
  await form.getByLabel(/Ação realizada/).fill('Primeira ação E2E');
  await form.getByLabel(/Resultado ou observações/).fill('Primeiro resultado E2E');
  await form.getByRole('button', { name: 'Salvar atendimento' }).click();
  await expect(page.getByText('Primeira ação E2E')).toBeVisible();
  await expect(form.getByLabel(/Agente ou responsável/)).toHaveValue('');
  await expect(form.getByLabel(/Ação realizada/)).toHaveValue('');
});

test('RF-015 Consulta não vê dados pessoais ou diferenças privadas', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies((await fixtureCookies('consulta')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
  await page.goto(`/painel/ocorrencias/${occurrenceA}`);
  await expect(page.getByRole('heading', { name: 'Detalhe da ocorrência' })).toBeVisible();
  const content = await page.locator('body').innerText();
  for (const value of [privateName, privateContact, privateReason, privateDiff, 'SENTINEL_PRIVATE_PHOTO_TICKET05', 'SENTINEL_PRIVATE_OBJECT_TICKET05']) {
    expect(content).not.toContain(value);
  }
  for (const value of ['Nome\n', 'Contato\n', privateName, privateContact]) expect(content).not.toContain(value);
  await expect(page.getByRole('button', { name: 'Salvar atendimento' })).toHaveCount(0);
});

test('RF-010 ocorrência sem posição mostra estado indisponível', async ({ page }) => {
  const id = '30000000-0000-4000-8000-000000000097';
  await page.route(`**/api/core/occurrences/${id}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id,
      protocol: 'TEST-LEGACY-NO-POSITION',
      type: 'fixture',
      description: 'legacy synthetic',
      status: { code: 'NOVA', label: 'Nova' },
      priority: 'NORMAL',
      group: { id: '20000000-0000-4000-8000-000000000001', name: 'Fixture A' },
      position: null,
      openedAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2020-01-01T00:00:00.000Z',
      version: 1,
      classification: null,
      events: [],
      occurrenceContext: { registeringInstitution: null, neighborhood: null, locality: null },
      triage: { situation: null, damageLocation: null, hasVictims: null, hasDisplaced: null, needsMedicalSupport: null },
      serviceRecords: [],
      actions: { canOperate: false, canReclassify: false, canAdminister: false, availableTransitions: [] },
      availableGroups: [],
      serviceAgencyOptions: [],
    }),
  }));
  await page.goto(`/painel/ocorrencias/${id}`);
  await expect(page.getByText('Localização indisponível')).toBeVisible();
  await expect(page.getByText('Apoio médico', {exact:true}).locator('..')).toContainText('Não informado');
  await expect(page.getByText(/-29\.5|-50\.5/)).toHaveCount(0);
});

test('RF-010 ocorrência fora do escopo mostra estado indisponível', async ({ page }) => {
  await page.goto(`/painel/ocorrencias/${occurrenceB}`);
  await expect(page.getByRole('heading', { name: 'Ocorrência indisponível' })).toBeVisible();
  const content = await page.locator('body').innerText();
  expect(content).not.toContain(`TEST-${occurrenceB}`);
  expect(content).not.toContain('synthetic');
});
