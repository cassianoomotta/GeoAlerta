import { expect, test } from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';

test('gestor cadastra, inicia e encerra evento climático sem ocorrências', async ({ page }) => {
  await page.context().addCookies((await fixtureCookies('gestor')).map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  const initialEvents = page.waitForResponse(response => response.url().endsWith('/api/core/climate-events') && response.request().method() === 'GET');
  await page.goto('/painel/admin/climate-events');
  await initialEvents;
  await expect(page.getByRole('heading', { name: 'Gestão de eventos climáticos' })).toBeVisible();
  const name = `Evento browser ${Date.now()}`;
  await page.getByLabel('Nome', { exact: true }).fill(name);
  const plannedStart = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const plannedEnd = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel('Início previsto').fill(plannedStart);
  await page.getByLabel('Fim previsto').fill(plannedEnd);
  const [response] = await Promise.all([
    page.waitForResponse(candidate => candidate.url().endsWith('/api/core/climate-events') && candidate.request().method() === 'POST'),
    page.getByRole('button', { name: 'Cadastrar como planejado' }).click(),
  ]);
  expect(response.status(), await response.text()).toBe(201);
  const card = page.getByRole('article').filter({ hasText: name });
  await expect(card.getByText('Planejado', { exact: true })).toBeVisible();
  page.on('dialog', dialog => dialog.accept());
  await card.getByRole('button', { name: 'Iniciar evento' }).click();
  await expect(card.getByText('Em andamento', { exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Encerrar evento' }).click();
  await expect(card.getByText('Encerrado', { exact: true })).toBeVisible();
});

test('operador não recebe acesso à gestão climática', async ({ page, request }) => {
  const cookies = await fixtureCookies('operador');
  await page.context().addCookies(cookies.map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  await page.goto('/painel/admin/climate-events');
  await expect(page.getByRole('alert')).toContainText('disponível para gestores e administradores');
  const response = await request.get('/api/core/climate-events', { headers: { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') } });
  expect(response.status()).toBe(200);
  const denied = await request.post('/api/core/climate-events', { headers: { Cookie: cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ') }, data: { action: 'create', name: 'No', plannedStart: '2026-10-06', plannedEnd: '2026-10-07' } });
  expect(denied.status()).toBe(403);
});
