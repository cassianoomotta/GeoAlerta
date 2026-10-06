import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {mapFixture} from '../fixtures/map';
let fixture:Awaited<ReturnType<typeof mapFixture>>;
test.beforeAll(async()=>{fixture=await mapFixture();});
test.afterAll(async()=>{await fixture?.cleanup();});
test.beforeEach(async({page,context})=>{
  await context.addCookies((await fixtureCookies('gestor')).map(cookie=>({...cookie,url:'http://127.0.0.1:3102'})));
  await page.route('**/*',route=>['127.0.0.1','localhost'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort());
  await page.goto('/painel/mapa');
  await page.getByLabel('Data inicial do mapa').fill('2022-01-01');
  await page.getByLabel('Data final do mapa').fill('2022-01-02');
  await expect(page.getByText('5 ocorrências visíveis.',{exact:true})).toBeVisible();
});

test('ícones, filtros combinados, ocultar/exibir todos e atualização conservam a seleção',async({page})=>{
  const markers=page.locator('.occurrence-map-icon');
  await expect(markers).toHaveCount(5);
  await expect(page.locator('.occurrence-marker-warning')).toHaveCount(1);
  await markers.filter({has:page.locator('.occurrence-marker-warning')}).click();
  await expect(page.locator('.leaflet-popup-content')).toContainText(fixture.records[1].protocol);
  await expect(page.locator('.leaflet-popup-content')).toContainText('Incêndio');
  await expect(page.getByRole('link',{name:'Abrir ocorrência',exact:true})).toHaveAttribute('href',`/painel/ocorrencias/${fixture.records[1].id}`);
  await page.getByRole('button',{name:'Ocultar todos',exact:true}).click();
  await expect(markers).toHaveCount(0);await expect(page.getByText('Todos os registros estão ocultos.',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Exibir todos',exact:true}).click();await expect(markers).toHaveCount(5);
  await page.getByRole('button',{name:/Tipos de ocorrência/}).click();
  await page.getByRole('button',{name:'Limpar tipos',exact:true}).click();
  await page.getByRole('searchbox',{name:'Buscar tipo de ocorrência'}).fill('arvore');
  await page.getByRole('checkbox',{name:'Queda de Árvore',exact:true}).check();
  await expect(markers).toHaveCount(2);
  await page.getByRole('button',{name:/^Filtrar status: Novas?$/}).click();
  await expect(markers).toHaveCount(1);
  await expect(page.getByRole('button',{name:/^Filtrar status: Novas?$/})).toHaveAttribute('aria-pressed','false');
  await page.evaluate(()=>document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('1 ocorrência visível.',{exact:true})).toBeVisible();
  await expect(page.getByRole('checkbox',{name:'Queda de Árvore',exact:true})).toBeChecked();
});

test('status têm cores distintas e tipos diferentes têm desenhos distintos',async({page})=>{
  await expect(page.locator('.occurrence-map-icon')).toHaveCount(5);
  const colors=await page.locator('.occurrence-marker').evaluateAll(elements=>elements.map(element=>getComputedStyle(element).backgroundColor));
  expect(new Set(colors).size).toBe(5);
  const paths=await page.locator('.occurrence-marker > svg:first-child path').evaluateAll(elements=>elements.map(element=>element.getAttribute('d')));
  expect(new Set(paths).size).toBe(3);
  await page.getByRole('button',{name:'Filtrar prioridade normal',exact:true}).click();
  await expect(page.locator('.occurrence-map-icon')).toHaveCount(1);
  await expect(page.locator('.occurrence-marker-warning')).toHaveCount(1);
});

test('mapa e filtros funcionam no celular e desktop em ambos os temas',async({page})=>{
  for(const width of [1440,390]){
    await page.setViewportSize({width,height:1100});
    for(const theme of ['light','dark']){
      await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
      await expect(page.locator('.occurrence-map-icon')).toHaveCount(5);
      await expect(page.getByText('5 ocorrências visíveis.',{exact:true})).toBeVisible();
      const statusButton=page.getByRole('button',{name:/^Filtrar status: Novas?$/});
      await expect.poll(()=>statusButton.evaluate(element=>getComputedStyle(element).backgroundColor)).toBe(theme==='dark'?'rgb(33, 63, 62)':'rgb(230, 242, 242)');
      await expect.poll(()=>statusButton.evaluate(element=>getComputedStyle(element).color)).toBe(theme==='dark'?'rgb(230, 238, 235)':'rgb(36, 55, 70)');
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
      await page.screenshot({path:`/private/tmp/geoalerta-map-${width}-${theme}.png`,fullPage:true});
    }
  }
});
