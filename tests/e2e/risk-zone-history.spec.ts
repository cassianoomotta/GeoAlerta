import { expect, test } from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';

test.beforeEach(async ({ page, context }) => {
  await page.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    return ['127.0.0.1', 'localhost'].includes(host) ? route.continue() : route.abort();
  });
  await context.addCookies((await fixtureCookies('admin')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
});

test('RF-003 administrador compara dois instantes na tela histórica', async ({ page }) => {
  await page.goto('/painel/admin/risk-zones');
  await expect(page.getByRole('heading', { name: 'Comparar zonas por vigência' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="zones-list-title"] article').first()).toBeVisible();
  const base = page.getByLabel('Data base');
  const compared = page.getByLabel('Data comparada');
  await base.fill('2026-10-05T12:00');
  await expect(base).toHaveValue('2026-10-05T12:00');
  await compared.fill('2026-10-06T12:00');
  await expect(compared).toHaveValue('2026-10-06T12:00');
  const historyResponse = page.waitForResponse((response) => response.url().includes('/api/core/admin/risk-zones?at='));
  await page.getByRole('button', { name: 'Comparar datas' }).click();
  const response = await historyResponse;
  expect(response.status()).toBe(200);

  const legend = page.getByRole('group', { name: 'Legenda do mapa histórico' });
  await expect(legend).toBeVisible();
  await expect(legend).toContainText('Data base');
  await expect(legend).toContainText('Data comparada');
  await expect(legend).toContainText('Linha contínua: inundação · tracejada: risco');
  await expect(legend).toContainText('Estado: aparecem somente zonas ativas e dentro da vigência');
  await expect(page.getByRole('img', { name: 'Mapa com as zonas efetivas nas duas datas selecionadas' })).toBeVisible();
});

test('RF-003 perfil sem capacidade administrativa não abre o gerenciamento histórico', async ({ page, context }) => {
  await context.clearCookies();
  await context.addCookies((await fixtureCookies('operador')).map((cookie) => ({ ...cookie, url: 'http://127.0.0.1:3102' })));
  const response = await page.goto('/painel/admin/risk-zones');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Zonas de risco' })).toBeVisible();
  await expect(page.getByText('Esta área está disponível somente para administradores ativos.', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comparar zonas por vigência' })).toHaveCount(0);
});
