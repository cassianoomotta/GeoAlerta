import {test,expect} from '@playwright/test';
import { fixtureCookies } from '../fixtures/session';
test.beforeEach(async({page})=>{await page.route('**/*',route=>{const host=new URL(route.request().url()).hostname;return ['127.0.0.1','localhost'].includes(host)?route.continue():route.abort();});await page.goto('/login');await expect(page.getByRole('button',{name:'Entrar no Painel'})).toBeEnabled();});
test('RF-005 login ATIVO entra no painel e logout remove acesso',async({page})=>{
  await page.getByPlaceholder('operador@prefeitura.gov.br').fill('operador@fixture.invalid');await page.getByPlaceholder('••••••••').fill('fixture-password');await page.getByRole('button',{name:'Entrar no Painel'}).click();await expect(page).toHaveURL(/\/painel/);
  await page.getByRole('link',{name:'Meu perfil'}).first().click();await expect(page).toHaveURL(/\/painel\/perfil/);
  const logout=page.getByRole('button',{name:'Encerrar Sessão'});await logout.focus();await logout.press('Enter');await expect(page).toHaveURL(/\/login/);await page.goto('/painel');await expect(page).toHaveURL(/\/login/);
});
test('RF-005 credenciais inválidas e sessão prévia não ativa recusadas',async({page,context})=>{
  await page.getByPlaceholder('operador@prefeitura.gov.br').fill('invalid@fixture.invalid');await page.getByPlaceholder('••••••••').fill('wrong');await page.getByRole('button',{name:'Entrar no Painel'}).click();await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  for(const name of ['pendente','suspenso','desativado','semgrupo']){await context.clearCookies();await context.addCookies((await fixtureCookies(name)).map(c=>({...c,url:'http://127.0.0.1:3100'})));await page.goto('/painel');await expect(page).toHaveURL(/\/login/);}
});
