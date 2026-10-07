import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {eventDashboardFixture} from '../fixtures/event-dashboard';

let fixture:Awaited<ReturnType<typeof eventDashboardFixture>>;
test.beforeAll(async()=>{fixture=await eventDashboardFixture();});
test.afterAll(async()=>{await fixture?.cleanup();});
test.beforeEach(async({context})=>{
  await context.addCookies((await fixtureCookies('gestor')).map(cookie=>({...cookie,url:'http://127.0.0.1:3102'})));
});

test('painel mostra o evento ativo e compara categorias lado a lado de forma responsiva e acessível',async({page})=>{
  await page.goto('/painel');
  await expect(page.getByRole('heading',{name:'Acompanhar eventos climáticos',exact:true})).toBeVisible();
  const primary=page.getByLabel('Evento base');
  const comparison=page.getByLabel('Comparar com evento encerrado');
  await expect(primary).toHaveValue(fixture.ids.active);
  await expect(page.getByRole('region',{name:/Fixture active/}).getByText('Total de ocorrências',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:/Fixture active/})).toContainText('6');
  await comparison.selectOption(fixture.ids.closedC);
  await expect(page.getByRole('region',{name:/Fixture closedC/})).toContainText('120');
  await expect(page.getByRole('region',{name:/Fixture closedB/})).toHaveCount(0);
  await expect(page.getByRole('region',{name:/Fixture active/})).toContainText('Categoria C');
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await primary.focus();
  await page.keyboard.press('Tab');
  await expect(comparison).toBeFocused();
  await expect(page.getByText(/situação atual dos registros vinculados/)).toHaveCount(2);
  const activePanel=page.getByRole('region',{name:/Fixture active/});
  const comparisonPanel=page.getByRole('region',{name:/Fixture closedC/});
  const addedOccurrence=await fixture.addOccurrence(fixture.ids.active);
  await page.getByRole('button',{name:'Atualizar eventos'}).click();
  await expect(activePanel.getByText('Total de ocorrências',{exact:true}).locator('..')).toContainText('7');
  await fixture.changeOccurrenceStatus(addedOccurrence,'CANCELADA');
  await page.getByRole('button',{name:'Atualizar eventos'}).click();
  await expect(activePanel.getByText('Abertas',{exact:true}).locator('..')).toContainText('3');
  await expect(activePanel.getByText('Canceladas',{exact:true}).locator('..')).toContainText('2');
  await fixture.linkOccurrence(addedOccurrence,fixture.ids.closedC);
  await page.getByRole('button',{name:'Atualizar eventos'}).click();
  await expect(activePanel.getByText('Total de ocorrências',{exact:true}).locator('..')).toContainText('6');
  await expect(comparisonPanel.getByText('Total de ocorrências',{exact:true}).locator('..')).toContainText('121');
  await fixture.deleteOccurrence(addedOccurrence);
  await page.getByRole('button',{name:'Atualizar eventos'}).click();
  await expect(comparisonPanel.getByText('Total de ocorrências',{exact:true}).locator('..')).toContainText('120');
  await fixture.closeActiveEvent();
  await page.getByRole('button',{name:'Atualizar eventos'}).click();
  await expect(page.getByRole('region',{name:/Fixture active/})).toContainText('Encerrado');
});
