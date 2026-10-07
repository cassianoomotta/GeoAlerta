import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {eventDashboardFixture} from '../fixtures/event-dashboard';

let fixture:Awaited<ReturnType<typeof eventDashboardFixture>>;
let headers:Record<string,string>;
test.beforeAll(async()=>{
  fixture=await eventDashboardFixture();
  headers={Cookie:(await fixtureCookies('gestor')).map(cookie=>`${cookie.name}=${cookie.value}`).join('; ')};
});
test.afterAll(async()=>{await fixture?.cleanup();});

test('dashboard seleciona evento ativo e agrega apenas registros visíveis do vínculo persistido',async({request})=>{
  const response=await request.get('/api/core/dashboard/climate-events',{headers});
  expect(response.status()).toBe(200);
  const body=await response.json();
  expect(body.events.map((event:{id:string})=>event.id)).not.toContain(fixture.ids.planned);
  expect(body.selectedEventIds).toEqual([fixture.ids.active]);
  expect(body.metrics[0]).toMatchObject({total:6,open:3,closed:2,cancelled:1});
  expect(body.metrics[0].byType.map((item:{count:number})=>item.count)).toEqual([3,2,1]);
  expect(body.metrics[0].byPriority.map((item:{count:number})=>item.count)).toEqual([4,2]);
  expect(body.metrics[0].byMedicalSupport.map((item:{label:string;count:number;percentage:number})=>[item.label,item.count,item.percentage])).toEqual([['Sim',2,33.3],['Não',3,50],['Não informado',1,16.7]]);
  expect(body.metrics[0].byStatus.map((item:{count:number})=>item.count)).toEqual([1,1,1,2,1]);
  expect(JSON.stringify(body)).not.toMatch(/reporterName|reporterContact|description|protocol/);
});

test('compara eventos encerrados sem limite de paginação ou janela de 31 dias',async({request})=>{
  const response=await request.get(`/api/core/dashboard/climate-events?primary=${fixture.ids.closedB}&comparison=${fixture.ids.closedC}`,{headers});
  expect(response.status()).toBe(200);
  const body=await response.json();
  expect(body.selectedEventIds).toEqual([fixture.ids.closedB,fixture.ids.closedC]);
  expect(body.metrics.map((item:{total:number})=>item.total)).toEqual([0,120]);
  expect(body.metrics[0].byType).toEqual([{label:'Categoria C',count:0,percentage:0},{label:'Tipo histórico inativo',count:0,percentage:0}]);
  expect(body.metrics[0].byMedicalSupport).toEqual([{label:'Sim',count:0,percentage:0},{label:'Não',count:0,percentage:0},{label:'Não informado',count:0,percentage:0}]);
  expect(body.metrics[1].byType).toContainEqual({label:'Tipo histórico inativo',count:1,percentage:0.8});
  expect(body.metrics[1].byStatus.reduce((sum:number,item:{count:number})=>sum+item.count,0)).toBe(120);
});

test('recusa seleção malformada, planejada, de outro município e ausência de sessão',async({request})=>{
  expect((await request.get('/api/core/dashboard/climate-events')).status()).toBe(401);
  expect((await request.get('/api/core/dashboard/climate-events?unexpected=1',{headers})).status()).toBe(422);
  expect((await request.get(`/api/core/dashboard/climate-events?primary=${fixture.ids.otherMunicipality}`,{headers})).status()).toBe(404);
  expect((await request.get(`/api/core/dashboard/climate-events?primary=${fixture.ids.planned}`,{headers})).status()).toBe(404);
});

test('mantém os papéis de leitura no escopo de grupo e município ao consultar indicadores',async({request})=>{
  for(const [name,expectedTotal] of [['consulta',4],['operador',4],['gestor',6],['admin',7]] as const){
    const cookies=await fixtureCookies(name);
    const response=await request.get('/api/core/dashboard/climate-events',{headers:{Cookie:cookies.map(cookie=>`${cookie.name}=${cookie.value}`).join('; ')}});
    expect(response.status(),name).toBe(200);
    const body=await response.json();
    expect(body.selectedEventIds).toEqual([fixture.ids.active]);
    expect(body.metrics[0].total,name).toBe(expectedTotal);
  }
});

test('sem evento em andamento oferece o encerrado mais recente como padrão e mantém o histórico comparável',async({request})=>{
  await fixture.closeActiveEvent();
  const response=await request.get('/api/core/dashboard/climate-events',{headers});
  expect(response.status()).toBe(200);
  const body=await response.json();
  expect(body.selectedEventIds).toEqual([fixture.ids.active]);
  expect(body.events.find((event:{id:string})=>event.id===fixture.ids.active).state).toBe('ENCERRADO');
  expect(body.metrics[0].event.state).toBe('ENCERRADO');

  const historical=await request.get(`/api/core/dashboard/climate-events?primary=${fixture.ids.closedB}&comparison=${fixture.ids.closedC}`,{headers});
  expect(historical.status()).toBe(200);
  expect((await historical.json()).selectedEventIds).toEqual([fixture.ids.closedB,fixture.ids.closedC]);
});
