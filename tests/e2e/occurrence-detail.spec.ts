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
let browserRequests: string[] = [];

test.beforeAll(async () => {
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    const zoneId = '90000000-0000-4000-8000-000000000001';
    const polygon = "ST_Multi(ST_GeomFromText('POLYGON((-51 -30,-50 -30,-50 -29,-51 -29,-51 -30))',4326))";
    await db.query(`INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES ($1,1,'Zona histórica fixture','INUNDACAO',false,${polygon}),($1,2,'Zona atual fixture','INUNDACAO',true,${polygon}) ON CONFLICT(zone_id,version) DO UPDATE SET name=EXCLUDED.name,active=EXCLUDED.active`, [zoneId]);
    await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=$1', [occurrenceA]);
    await db.query(`INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version) VALUES ($1,$2,1) ON CONFLICT DO NOTHING`, [occurrenceA, zoneId]);
    await db.query(`UPDATE public.occurrences SET reporter_name=$1,photo_url='SENTINEL_PRIVATE_PHOTO_TICKET05' WHERE id=$2`, [privateName, occurrenceA]);
    await db.query(`UPDATE public.occurrence_private_data SET reporter_name=$1,reporter_contact=$2,photo_object_key='SENTINEL_PRIVATE_OBJECT_TICKET05' WHERE occurrence_id=$3`, [privateName, privateContact, occurrenceA]);
    await db.query(`INSERT INTO public.occurrence_events(id,occurrence_id,kind,at,reason,changes) VALUES ($1,$3,'abertura fixture','2020-01-01T00:00:00Z',$4,$5::jsonb),($2,$3,'classificação fixture','2020-01-02T00:00:00Z',$4,$5::jsonb) ON CONFLICT(id) DO UPDATE SET kind=EXCLUDED.kind,at=EXCLUDED.at,reason=EXCLUDED.reason,changes=EXCLUDED.changes`, [orderedEventOne, orderedEventTwo, occurrenceA, privateReason, JSON.stringify({ private: privateDiff })]);
  } finally {
    await db.end();
  }
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
  await expect(page.getByText(`TEST-${occurrenceA}`)).toBeVisible();
  await expect(page.getByText('Zona histórica fixture')).toBeVisible();
  await expect(page.getByText('Versão 1')).toBeVisible();
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

test('RF-015 Consulta não vê dados pessoais ou diferenças privadas', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies((await fixtureCookies('consulta')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
  await page.goto(`/painel/ocorrencias/${occurrenceA}`);
  await expect(page.getByRole('heading', { name: 'Detalhe da ocorrência' })).toBeVisible();
  const content = await page.locator('body').innerText();
  for (const value of [privateName, privateContact, privateReason, privateDiff, 'SENTINEL_PRIVATE_PHOTO_TICKET05', 'SENTINEL_PRIVATE_OBJECT_TICKET05']) {
    expect(content).not.toContain(value);
  }
  for (const label of ['Contato', 'Foto', 'Motivo', 'Alterações']) expect(content).not.toContain(label);
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
    }),
  }));
  await page.goto(`/painel/ocorrencias/${id}`);
  await expect(page.getByText('Localização indisponível')).toBeVisible();
  await expect(page.getByText(/-29\.5|-50\.5/)).toHaveCount(0);
});

test('RF-010 ocorrência fora do escopo mostra estado indisponível', async ({ page }) => {
  await page.goto(`/painel/ocorrencias/${occurrenceB}`);
  await expect(page.getByRole('heading', { name: 'Ocorrência indisponível' })).toBeVisible();
  const content = await page.locator('body').innerText();
  expect(content).not.toContain(`TEST-${occurrenceB}`);
  expect(content).not.toContain('synthetic');
});
