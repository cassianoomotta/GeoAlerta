import {test,expect} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {listType} from '../fixtures/list';
import {publicColumns} from '../../src/features/occurrences/list-input';
test.beforeEach(async({page,context,request})=>{
  const cookies=await fixtureCookies('operador');await context.addCookies(cookies.map(c=>({...c,url:'http://127.0.0.1:3102'})));
  await request.put('/api/core/preferences/columns',{headers:{Cookie:cookies.map(c=>`${c.name}=${c.value}`).join('; ')},data:{columns:publicColumns}});
  await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test('RF-009 lista filtra status e categoria pela barra preservando URL e paginação',async({page})=>{
  await page.goto(`/painel/ocorrencias?type=${listType()}&pageSize=50&sort=createdAt&direction=desc`);
  await expect(page.locator('aside').getByRole('link',{name:'Ocorrências',exact:true})).toHaveCount(1);
  await expect(page.locator('aside').getByRole('link',{name:'Nova',exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Todos os status'})).toHaveCount(0);
  await expect(page.getByText('125 ocorrências · Página 1 de 3',{exact:true})).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(50);
  const form=page.getByRole('form',{name:'Filtros de ocorrências'});
  await expect(form.getByLabel('Tipo',{exact:true})).toHaveJSProperty('tagName','SELECT');
  await expect(form.getByLabel('Situação da categoria',{exact:true})).toHaveJSProperty('tagName','SELECT');
  await page.getByRole('link',{name:'Próxima página'}).click();await expect(page).toHaveURL(/page=2/);await expect(page.locator('tbody tr')).toHaveCount(50);expect(new URL(page.url()).searchParams.get('type')).toBe(listType());
  await page.getByRole('columnheader',{name:'Status',exact:true}).getByRole('link').click();await expect(page).toHaveURL(/sort=status/);expect(new URL(page.url()).searchParams.get('page')).toBe('1');
  await form.getByLabel('Status',{exact:true}).selectOption('NOVA');await page.getByRole('button',{name:'Aplicar filtros'}).click();await expect(page).toHaveURL(/status=NOVA/);expect(new URL(page.url()).searchParams.get('type')).toBe(listType());await expect(page.locator('tbody tr')).toHaveCount(25);
  await form.getByLabel('Situação da categoria',{exact:true}).selectOption('active');await page.getByRole('button',{name:'Aplicar filtros'}).click();await expect(page).toHaveURL(/categoryStatus=active/);await expect(page.locator('tbody tr')).toHaveCount(25);
  await form.getByRole('combobox',{name:/^Prioridade/}).selectOption('ALTA');await form.getByLabel('De (UTC)',{exact:true}).fill('2025-01-02');await form.getByLabel('Até (UTC)',{exact:true}).fill('2025-01-03');await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page).toHaveURL(/priority=ALTA/);await expect(form.getByLabel('Tipo',{exact:true})).toHaveValue(listType());await page.reload();await expect(form.getByRole('combobox',{name:/^Prioridade/})).toHaveValue('ALTA');
});
test('RF-010 protocolo abre o detalhe autorizado da ocorrência',async({page})=>{
  await page.goto(`/painel/ocorrencias?type=${listType()}&pageSize=50&sort=createdAt&direction=desc`);
  const firstRow=page.locator('tbody tr').first();
  const protocol=(await firstRow.locator('td').first().innerText()).trim();
  const protocolLink=firstRow.getByRole('link',{name:protocol,exact:true});
  await expect(protocolLink).toHaveAttribute('href',/\/painel\/ocorrencias\/[0-9a-f-]{36}$/i);
  await protocolLink.click();
  await expect(page).toHaveURL(/\/painel\/ocorrencias\/[0-9a-f-]{36}$/i);
  await expect(page.getByRole('heading',{name:'Detalhe da ocorrência'})).toBeVisible();
  await expect(page.getByText(`Protocolo ${protocol}`,{exact:true})).toBeVisible();
});
test('RF-009 colunas pessoais são restauradas sem afetar Consulta e erro/vazio são recuperáveis',async({page,context})=>{
  await page.goto(`/painel/ocorrencias?type=${listType()}`);await page.getByText('Minhas colunas',{exact:true}).click();
  await page.getByLabel('Tipo',{exact:true}).last().uncheck();await page.getByLabel('Nome do cidadão',{exact:true}).check();await expect(page.getByRole('button',{name:'Salvar colunas'})).toBeEnabled();
  await page.getByRole('button',{name:'Salvar colunas'}).click();await expect(page.getByRole('columnheader',{name:'Nome do cidadão',exact:true})).toBeVisible();await expect(page.getByRole('columnheader',{name:'Tipo',exact:true})).toHaveCount(0);await page.reload();await expect(page.getByRole('columnheader',{name:'Nome do cidadão',exact:true})).toBeVisible();
  await context.clearCookies();await context.addCookies((await fixtureCookies('consulta')).map(c=>({...c,url:'http://127.0.0.1:3102'})));await page.goto(`/painel/ocorrencias?type=${listType()}`);
  await expect(page.getByRole('columnheader',{name:'Tipo',exact:true})).toBeVisible();await expect(page.getByText('Nome do cidadão',{exact:true})).toHaveCount(0);await expect(page.getByText('Synthetic private name',{exact:true})).toHaveCount(0);
  await page.goto('/painel/ocorrencias?columns=reporterName');await expect(page.getByRole('alert').filter({hasText:'Verifique os filtros'})).toBeVisible();await page.goto('/painel/ocorrencias?type=absent-fixture-type');await expect(page.getByText('Nenhuma ocorrência encontrada para estes filtros.')).toBeVisible();
});
test('RF-009 tabela antiga redireciona preservando filtros compatíveis',async({page})=>{
  await page.goto(`/painel/tabela?type=${listType()}&status=Aberto&pageSize=25&sort=status&direction=asc`);await expect(page).toHaveURL(/\/painel\/ocorrencias\?/);expect(new URL(page.url()).searchParams.get('status')).toBe('NOVA');expect(new URL(page.url()).searchParams.get('type')).toBe(listType());await expect(page.locator('tbody tr')).toHaveCount(25);
});
