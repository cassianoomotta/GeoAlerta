import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { fixtureCookies } from '../fixtures/session';

async function signIn(page: import('@playwright/test').Page, name: 'admin' | 'operador') {
  await page.context().addCookies((await fixtureCookies(name)).map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
}

test('RF-004 Administrador encontra Abrigos nos menus desktop e mobile', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel');

  const desktopNav = page.locator('aside nav');
  const desktopSheltersLink = desktopNav.getByRole('link', { name: 'Abrigos' });
  await expect(desktopSheltersLink).toHaveAttribute('href', '/painel/admin/shelters');

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir Menu' }).click();
  const mobileNav = page.locator('nav').filter({ has: page.getByRole('link', { name: 'Meu perfil' }) });
  const mobileSheltersLink = mobileNav.getByRole('link', { name: 'Abrigos' });
  await expect(mobileSheltersLink).toHaveAttribute('href', '/painel/admin/shelters');
  await mobileSheltersLink.click();
  await expect(page).toHaveURL(/\/painel\/admin\/shelters$/);
});

test('RF-004 Operador não vê o módulo Abrigos na navegação', async ({ page }) => {
  await signIn(page, 'operador');
  await page.goto('/painel');
  await expect(page.locator('aside nav').getByRole('link', { name: 'Abrigos' })).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Abrir Menu' }).click();
  await expect(page.locator('nav').filter({ has: page.getByRole('link', { name: 'Meu perfil' }) }).getByRole('link', { name: 'Abrigos' })).toHaveCount(0);
});

test('RF-004 Administrador cadastra, edita, desativa e exclui abrigo', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel/admin');
  await page.getByRole('link', { name: 'Administrar abrigos' }).click();
  await expect(page).toHaveURL(/\/painel\/admin\/shelters$/);
  await expect(page.getByLabel('Nome do abrigo *')).toHaveCount(0);
  await page.getByRole('link', { name: 'Cadastrar abrigo' }).click();
  await expect(page).toHaveURL(/\/painel\/admin\/shelters\/novo$/);
  const name = `Abrigo E2E ${randomUUID()}`;
  await page.getByLabel('Nome do abrigo *').fill(name);
  await page.getByLabel('Endereço *').fill('Rua de Teste, 10, Santo Antônio da Patrulha');
  await page.getByLabel('Latitude').fill('-29.82');
  await page.getByLabel('Longitude').fill('-50.52');
  await page.getByRole('button', { name: 'Cadastrar abrigo' }).click();
  await expect(page).toHaveURL(/\/painel\/admin\/shelters$/);
  const item = page.locator('article').filter({ hasText: name });
  await expect(item).toContainText('Aberto');
  await item.getByRole('link', { name: 'Editar' }).click();
  await expect(page).toHaveURL(new RegExp(`/painel/admin/shelters/.+/editar$`));
  await expect(page.getByRole('heading', { name: 'Editar abrigo', exact: true, level: 2 })).toBeVisible();
  await expect(page.getByLabel('Nome do abrigo *')).toHaveValue(name);
  await page.getByLabel('Situação').selectOption('Lotado');
  await page.getByLabel('Ativo').uncheck();
  await page.getByRole('button', { name: 'Salvar alterações' }).click();
  await expect(page).toHaveURL(/\/painel\/admin\/shelters$/);
  await expect(item).toContainText('Lotado');
  await expect(item).toContainText('Inativo');
  await item.getByRole('button', { name: 'Excluir' }).click();
  await expect(item).not.toBeVisible();
});

test('RF-004 Operador não acessa administração de abrigos', async ({ page, request }) => {
  const cookies = await fixtureCookies('operador');
  await page.context().addCookies(cookies.map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
  await page.goto('/painel/admin/shelters');
  await expect(page.getByRole('alert')).toContainText('somente para administradores');
  await page.goto('/painel/admin/shelters/novo');
  await expect(page.getByRole('alert')).toContainText('somente para administradores');
  await page.goto('/painel/admin/shelters/50000000-0000-4000-8000-000000000001/editar');
  await expect(page.getByRole('alert')).toContainText('somente para administradores');
  const headers = { Cookie: cookies.map(({ name, value }) => `${name}=${value}`).join('; ') };
  expect((await request.get('/api/core/admin/shelters', { headers })).status()).toBe(403);
  expect((await request.post('/api/core/admin/shelters', { headers, data: { action: 'delete', id: '50000000-0000-4000-8000-000000000001' } })).status()).toBe(403);
});
