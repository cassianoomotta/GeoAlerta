import { expect, test } from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';

async function signIn(page: import('@playwright/test').Page, name: 'admin' | 'operador') {
  await page.context().addCookies((await fixtureCookies(name)).map(cookie => ({ ...cookie, url: 'http://127.0.0.1:3100' })));
}

test('RF-004 administrador consulta e edita pessoas por grupo', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel/admin');
  await page.getByRole('link', { name: 'Consultar pessoas por grupo' }).click();
  await expect(page).toHaveURL(/\/painel\/admin\/grupos$/);

  await expect(page.getByRole('heading', { name: 'Pessoas por grupo' })).toBeVisible();
  await expect(page.getByLabel('Grupo')).toHaveValue('20000000-0000-4000-8000-000000000001');
  const createForm = page.getByRole('form', { name: 'Criar pessoa no grupo Triagem inicial' });
  await expect(createForm.getByRole('textbox', { name: 'Nome *' })).toBeVisible();
  await expect(createForm.getByRole('textbox', { name: 'Telefone' })).toBeVisible();
  await expect(createForm.getByRole('textbox', { name: 'E-mail *' })).toBeVisible();
  await expect(createForm.getByRole('combobox', { name: 'Papel inicial *' })).toBeVisible();
  await expect(createForm.getByRole('button', { name: 'Criar conta neste grupo' })).toBeEnabled();
  await expect(page.getByRole('listitem')).toContainText(['Consulta', 'Gestor', 'Operador', 'Pendente', 'Suspenso', 'Desativado']);
  await expect(page.getByRole('button', { name: 'Editar dados' })).toHaveCount(6);
  await page.getByRole('button', { name: 'Editar dados' }).first().click();
  await expect(page.getByRole('textbox', { name: 'Nome' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Telefone' })).toBeVisible();
  const memberGroups = page.locator('form').filter({ has: page.getByRole('button', { name: 'Salvar dados e grupos' }) }).locator('details');
  await expect(memberGroups.locator('summary')).toHaveClass(/bg-background/);
  await expect(page.getByRole('button', { name: 'Salvar dados e grupos' })).toBeVisible();
  await page.getByRole('button', { name: 'Editar dados' }).first().click();

  await page.getByLabel('Grupo').selectOption('20000000-0000-4000-8000-000000000002');
  await page.getByRole('button', { name: 'Consultar grupo' }).click();
  await expect(page).toHaveURL(/groupId=20000000-0000-4000-8000-000000000002/);
  await expect(page.getByRole('listitem')).toHaveCount(1);
  await expect(page.getByRole('listitem')).toContainText('Gestor');
  await expect(page.getByRole('combobox', { name: 'Adicionar pessoa existente' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adicionar ao grupo' })).toBeDisabled();
});

test('RF-004 operador não acessa a consulta de pessoas por grupo', async ({ page }) => {
  await signIn(page, 'operador');
  await page.goto('/painel/admin/grupos');
  await expect(page.getByRole('alert')).toContainText('somente para administradores');
  await expect(page.getByText('consulta', { exact: true })).toHaveCount(0);
});

test('RF-013 cadastro de usuário mostra nome, telefone e e-mail nessa ordem e grupo no padrão dos campos', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel/admin');
  const form = page.locator('form').filter({ has: page.getByRole('button', { name: 'Criar conta' }) });
  const firstFields = await form.locator('label').evaluateAll(labels => labels.slice(0, 3).map(label => label.textContent?.trim().split('*')[0].trim()));
  expect(firstFields).toEqual(['Nome', 'Telefone', 'E-mail']);
  await expect(form.getByText('Grupo padrão', { exact: true })).toHaveCount(0);
  const groups = form.locator('details').filter({ has: form.getByText('Grupos autorizados', { exact: true }) });
  await expect(groups.locator('summary')).toHaveClass(/bg-background/);
  await expect(groups.locator('summary')).toContainText('Selecione grupos');
  await groups.locator('summary').click();
  await expect(groups.getByLabel('Triagem inicial')).toBeVisible();
  await expect(groups.locator('fieldset')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await expect(groups.locator('label').first().locator('span')).toHaveCSS('background-color', 'rgb(23, 105, 210)');
  await groups.getByLabel('Triagem inicial').check();
  await expect(groups.locator('label').filter({ hasText: 'Triagem inicial' }).locator('span')).toHaveCSS('background-color', 'rgb(23, 105, 210)');
});

test('RF-013 grupos dos usuários cadastrados usam o mesmo seletor visual', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel/admin');
  const user = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Administrador inicial' }) });
  const groups = user.locator('details').filter({ has: user.getByText('Grupos', { exact: true }) });
  await expect(groups.locator('summary')).toHaveClass(/bg-background/);
  await groups.locator('summary').click();
  await expect(groups.getByLabel('Triagem inicial')).toBeVisible();
});

test('RF-014 navegação municipal mostra o módulo antes do perfil e mantém retorno à lista nos formulários', async ({ page }) => {
  await signIn(page, 'admin');
  await page.goto('/painel/admin/shelters');

  const navigation = page.getByRole('navigation', { name: 'Navegação do painel' });
  const municipalAdmin = navigation.getByRole('link', { name: 'Gestão municipal' });
  const profile = navigation.getByRole('link', { name: 'Meu perfil' });
  await expect(municipalAdmin).toHaveAttribute('href', '/painel/admin');
  await expect(profile).toBeVisible();
  expect(await municipalAdmin.evaluate(link => link.compareDocumentPosition(link.parentElement!.querySelector('a[href="/painel/perfil"]')!) & Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
  await expect(navigation.getByRole('link', { name: 'Abrigos' })).toHaveAttribute('aria-current', 'page');
  await expect(municipalAdmin).not.toHaveAttribute('aria-current', 'page');

  await expect(page.getByRole('heading', { name: 'Administrar abrigos' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar à administração' })).toHaveCount(0);

  await page.goto('/painel/admin/shelters/novo');
  await expect(page.getByRole('link', { name: 'Cancelar e voltar à lista' })).toHaveAttribute('href', '/painel/admin/shelters');
});
