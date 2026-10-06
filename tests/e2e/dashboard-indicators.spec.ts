import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {dashboardFixture} from '../fixtures/dashboard';
import {mkdir} from 'node:fs/promises';
let cleanup:()=>Promise<void>;
test.beforeAll(async()=>{cleanup=await dashboardFixture();});
test.afterAll(async()=>{await cleanup?.();});
test.beforeEach(async({context,page})=>{
  await context.addCookies((await fixtureCookies('gestor')).map(cookie=>({...cookie,url:'http://127.0.0.1:3102'})));
  await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
});
test('quadro filtra todos os gráficos, apresenta dados exatos e diferencia encerramento de status atual',async({page})=>{
  await page.goto('/painel');
  await expect(page.getByRole('heading',{name:'Quadro de situação',exact:true})).toBeVisible();
  await page.getByLabel('Data inicial do dashboard').fill('2024-06-01');
  await page.getByLabel('Data final do dashboard').fill('2024-06-03');
  await expect(page.getByText('01/06/2024 a 03/06/2024',{exact:true})).toBeVisible();
  for(const label of ['Gráfico de barras: ocorrências registradas por dia','Gráfico de pizza: distribuição das ocorrências por status','Gráfico de colunas: ocorrências por tipo','Gráfico de área: ocorrências abertas versus encerradas por dia'])await expect(page.getByRole('img',{name:label,exact:true})).toBeVisible();
  const activity=page.getByRole('region',{name:'Abertas e encerradas por dia',exact:true});
  await activity.getByText('Consultar dados do gráfico').click();
  await expect(activity.getByRole('row').filter({hasText:'02/06/2024'})).toHaveText('02/06/202411');
  await expect(page.getByText(/Última atualização:/)).toBeVisible();
  await page.getByLabel('Data final do dashboard').fill('2024-08-01');
  await expect(page.getByRole('alert').filter({hasText:'até 31 dias'})).toBeVisible();
  await expect(page.getByRole('img',{name:/Gráfico de/})).toHaveCount(0);
  await page.getByRole('button',{name:'Limpar período'}).click();
  await expect(page.getByText('Todo o histórico',{exact:true})).toBeVisible();
});
test('quadro funciona sem overflow em desktop e celular nos temas claro e escuro',async({page})=>{
  await mkdir('.cache/dashboard-preview',{recursive:true});
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1000});
    await page.goto('/painel');
    await page.getByLabel('Data inicial do dashboard').fill('2024-06-01');
    await page.getByLabel('Data final do dashboard').fill('2024-06-03');
    await expect(page.getByText('01/06/2024 a 03/06/2024',{exact:true})).toBeVisible();
    for(const theme of ['light','dark']){
      await page.evaluate(value=>{document.documentElement.dataset.theme=value;},theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      expect(await page.locator('#panel-content').evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
      await page.screenshot({path:`.cache/dashboard-preview/dashboard-${width}-${theme}.png`});
    }
  }
});
test('período vazio e falha de atualização mantêm mensagens explícitas',async({page})=>{
  await page.goto('/painel');
  await page.getByLabel('Data inicial do dashboard').fill('2023-01-01');
  await page.getByLabel('Data final do dashboard').fill('2023-01-03');
  await expect(page.getByText('Nenhuma ocorrência registrada neste período.',{exact:true})).toBeVisible();
  await expect(page.getByText('Nenhuma abertura ou encerramento neste período.',{exact:true})).toBeVisible();
  await page.route('**/api/core/dashboard/indicators?*',route=>route.fulfill({status:503,json:{error:{message:'Serviço temporariamente indisponível.'}}}));
  await page.getByRole('button',{name:'Atualizar',exact:true}).click();
  await expect(page.getByRole('alert').filter({hasText:'Não foi possível atualizar os dados.'})).toContainText('última consulta confirmada');
  await expect(page.getByText(/Dados desatualizados/)).toBeVisible();
});
