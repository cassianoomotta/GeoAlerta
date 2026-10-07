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
  await expect(page.locator('aside').getByRole('link',{name:'Lista de ocorrências',exact:true})).toHaveCount(1);
  await expect(page.locator('aside').getByRole('link',{name:'Nova ocorrência',exact:true})).toHaveAttribute('href','/painel/ocorrencias/nova');
  await expect(page.getByRole('button',{name:'Obter localização GPS'})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'Todos os status'})).toHaveCount(0);
  await expect(page.getByText('125 ocorrências · Página 1 de 3',{exact:true})).toBeVisible();await expect(page.locator('tbody tr')).toHaveCount(50);
  const filters=page.locator('details[aria-label="Filtros de ocorrências"]');
  const showFilters=async()=>{
    if(!(await filters.evaluate(element=>(element as HTMLDetailsElement).open)))await filters.locator('summary').click();
    await expect(filters).toHaveJSProperty('open',true);
  };
  await showFilters();
  const form=filters.locator('form[aria-label="Filtros de ocorrências"]');
  await expect(form.getByRole('combobox',{name:'Tipo'})).toHaveJSProperty('tagName','SELECT');
  await expect(form.getByRole('combobox',{name:'Situação da categoria'})).toHaveJSProperty('tagName','SELECT');
  await page.getByRole('link',{name:'Próxima página'}).click();await expect(page).toHaveURL(/page=2/);await expect(page.locator('tbody tr')).toHaveCount(50);expect(new URL(page.url()).searchParams.get('type')).toBe(listType());
  await showFilters();
  await page.getByRole('link',{name:'Ordenar por Status'}).click();await expect(page).toHaveURL(/sort=status/);expect(new URL(page.url()).searchParams.get('page')).toBe('1');
  await showFilters();
  await form.getByRole('combobox',{name:'Status'}).selectOption('NOVA');await page.getByRole('button',{name:'Aplicar filtros'}).click();await expect(page).toHaveURL(/status=NOVA/);expect(new URL(page.url()).searchParams.get('type')).toBe(listType());await expect(page.locator('tbody tr')).toHaveCount(25);
  await showFilters();
  await form.getByRole('combobox',{name:'Situação da categoria'}).selectOption('active');await page.getByRole('button',{name:'Aplicar filtros'}).click();await expect(page).toHaveURL(/categoryStatus=active/);await expect(page.locator('tbody tr')).toHaveCount(25);
  await showFilters();
  await form.getByRole('combobox',{name:/^Prioridade/}).selectOption('ALTA');await form.getByLabel('De (UTC)',{exact:true}).fill('2025-01-02');await form.getByLabel('Até (UTC)',{exact:true}).fill('2025-01-03');await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page).toHaveURL(/priority=ALTA/);await showFilters();await expect(form.getByRole('combobox',{name:'Tipo'})).toHaveValue(listType());await page.reload();await showFilters();await expect(form.getByRole('combobox',{name:/^Prioridade/})).toHaveValue('ALTA');
});
test('RF-009 cada coluna ordena, protocolo não quebra, e identidade visual não muda no tema escuro',async({page})=>{
  await page.goto(`/painel/ocorrencias?type=${listType()}`);
  const columns=[['Protocolo','protocol'],['Registro','createdAt'],['Status','status'],['Prioridade','priority'],['Tipo','type'],['Grupo','groupId'],['Apoio médico','needsMedicalSupport']] as const;
  for(const [label,sort] of columns){
    const link=page.getByRole('link',{name:`Ordenar por ${label}`});
    await expect(link).toBeVisible();
    const header=link.locator('xpath=..');
    await expect(header).toHaveAttribute('aria-sort');
    if(sort==='protocol')await expect(header).toHaveClass(/whitespace-nowrap/);
    await link.click();
    await expect(page).toHaveURL(new RegExp(`sort=${sort}(?:&|$)`));
  }
  await page.getByRole('combobox',{name:'Aparência'}).selectOption({label:'Escuro'});
  const logo=page.locator('svg.geoalerta-logo');
  await expect(logo.locator('.geoalerta-logo-primary').first()).toHaveAttribute('fill','#087580');
  await expect(logo.locator('.geoalerta-logo-danger').first()).toHaveAttribute('fill','#A83F3F');
  await expect(page.locator('aside p span.whitespace-nowrap')).toContainText('· RS');
});
test('RF-009 filtros começam recolhidos e o seletor de grupo só aparece quando há mais de um grupo autorizado',async({page,context})=>{
  await page.goto(`/painel/ocorrencias?type=${listType()}`);
  const filters=page.locator('details[aria-label="Filtros de ocorrências"]');
  await expect(filters).toHaveJSProperty('open',false);
  await filters.locator('summary').click();
  await expect(filters).toHaveJSProperty('open',true);
  const form=filters.locator('form[aria-label="Filtros de ocorrências"]');
  await expect(form.getByRole('combobox',{name:'Tipo'})).toBeVisible();
  await expect(form.getByRole('combobox',{name:'Grupo'})).toHaveCount(0);

  await context.clearCookies();
  await context.addCookies((await fixtureCookies('gestor')).map(c=>({...c,url:'http://127.0.0.1:3102'})));
  await page.goto(`/painel/ocorrencias?type=${listType()}`);
  const managerFilters=page.locator('details[aria-label="Filtros de ocorrências"]');
  await managerFilters.locator('summary').click();
  await expect(managerFilters).toHaveJSProperty('open',true);
  await expect(managerFilters.locator('form').getByRole('combobox',{name:'Grupo'})).toBeVisible();
});
test('RF-009 origem do registro filtra a lista e permanece no link de exportação',async({page,context})=>{
  await context.clearCookies();
  await context.addCookies((await fixtureCookies('gestor')).map(c=>({...c,url:'http://127.0.0.1:3102'})));
  await page.goto(`/painel/ocorrencias?type=${listType()}`);
  const filters=page.locator('details[aria-label="Filtros de ocorrências"]');
  await filters.locator('summary').click();
  const form=filters.locator('form[aria-label="Filtros de ocorrências"]');
  const origin=form.getByRole('combobox',{name:'Origem do registro'});
  await expect(origin).toBeVisible();
  await origin.selectOption('BATALHAO');
  await page.getByRole('button',{name:'Aplicar filtros'}).click();
  await expect(page).toHaveURL(/registrationChannel=BATALHAO/);
  await expect(page.getByText('Nenhuma ocorrência encontrada para estes filtros.')).toBeVisible();
  await filters.locator('summary').click();
  await expect(filters.locator('form').getByRole('combobox',{name:'Origem do registro'})).toHaveValue('BATALHAO');
  const exportLink=page.getByRole('link',{name:'Baixar CSV das ocorrências filtradas'});
  await expect(exportLink).toHaveAttribute('href',/registrationChannel=BATALHAO/);
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
  const saveResponse=page.waitForResponse(response=>response.url().includes('/api/core/preferences/columns')&&response.request().method()==='PUT');await page.getByRole('button',{name:'Salvar colunas'}).click();const saved=await saveResponse;expect(saved.status()).toBe(200);await expect(page.getByRole('columnheader',{name:/Ordenar por Nome do cidadão/})).toBeVisible();await expect(page.getByRole('columnheader',{name:/Ordenar por Tipo/})).toHaveCount(0);await page.reload();await expect(page.getByRole('columnheader',{name:/Ordenar por Nome do cidadão/})).toBeVisible();
  await context.clearCookies();await context.addCookies((await fixtureCookies('consulta')).map(c=>({...c,url:'http://127.0.0.1:3102'})));await page.goto(`/painel/ocorrencias?type=${listType()}`);
  await expect(page.getByRole('columnheader',{name:/Ordenar por Tipo/})).toBeVisible();await expect(page.getByText('Nome do cidadão',{exact:true})).toHaveCount(0);await expect(page.getByText('Synthetic private name',{exact:true})).toHaveCount(0);
  await page.goto('/painel/ocorrencias?columns=reporterName');await expect(page.getByRole('alert').filter({hasText:'Verifique os filtros'})).toBeVisible();await page.goto('/painel/ocorrencias?type=absent-fixture-type');await expect(page.getByText('Nenhuma ocorrência encontrada para estes filtros.')).toBeVisible();
});
test('RF-009 tabela antiga redireciona preservando filtros compatíveis',async({page})=>{
  await page.goto(`/painel/tabela?type=${listType()}&status=Aberto&pageSize=25&sort=status&direction=asc`);await expect(page).toHaveURL(/\/painel\/ocorrencias\?/);expect(new URL(page.url()).searchParams.get('status')).toBe('NOVA');expect(new URL(page.url()).searchParams.get('type')).toBe(listType());await expect(page.locator('tbody tr')).toHaveCount(25);
});
