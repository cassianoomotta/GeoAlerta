import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {dashboardFixture} from '../fixtures/dashboard';
const path='/api/core/dashboard/indicators';
let cleanup:()=>Promise<void>;
test.beforeAll(async()=>{cleanup=await dashboardFixture();});
test.afterAll(async()=>{await cleanup?.();});
async function headers(name:string){return {Cookie:(await fixtureCookies(name)).map(item=>`${item.name}=${item.value}`).join('; ')};}

test('indicadores agregam período local com dias vazios e encerramentos anteriores à abertura do período',async({request})=>{
  const response=await request.get(`${path}?from=2024-06-01&to=2024-06-03`,{headers:await headers('consulta')});
  expect(response.status()).toBe(200);
  const body=await response.json();
  expect(body.summary).toEqual({total:1,open:1,inProgress:0,highPriority:0});
  expect(body.byType).toEqual([{type:'Resgate de teste',count:1}]);
  expect(body.daily).toEqual([{day:'2024-06-01',opened:1,closed:0},{day:'2024-06-02',opened:0,closed:1},{day:'2024-06-03',opened:0,closed:0}]);
  expect(body.window).toEqual({from:'2024-06-01T03:00:00.000Z',to:'2024-06-04T03:00:00.000Z'});
  expect(response.headers()['cache-control']).toBe('no-store');
  expect(JSON.stringify(body)).not.toMatch(/reporter|reason|changes|DASH-/);
});
test('indicadores preservam acesso por grupo e recusam sessões e filtros inválidos',async({request})=>{
  expect((await request.get(path)).status()).toBe(401);
  for(const name of ['suspenso','semgrupo','outromunicipio'])expect((await request.get(path,{headers:await headers(name)})).status()).toBe(403);
  for(const name of ['gestor','admin']){
    const response=await request.get(`${path}?from=2024-06-01&to=2024-06-03`,{headers:await headers(name)});
    expect(response.status()).toBe(200);expect((await response.json()).summary).toEqual({total:2,open:2,inProgress:1,highPriority:1});
  }
  for(const query of ['from=2024-02-30','from=2024-05-01&to=2024-06-03','groupId=all'])expect((await request.get(`${path}?${query}`,{headers:await headers('consulta')})).status()).toBe(422);
});
