import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';
import {mapFixture} from '../fixtures/map';
let fixture:Awaited<ReturnType<typeof mapFixture>>;
let headers:Record<string,string>;
const window='from=2022-01-01&to=2022-01-02&west=-50.51&south=-29.81&east=-50.47&north=-29.77';
test.beforeAll(async()=>{
  fixture=await mapFixture(true);
  headers={Cookie:(await fixtureCookies('gestor')).map(cookie=>`${cookie.name}=${cookie.value}`).join('; ')};
});
test.afterAll(async()=>{await fixture?.cleanup();});

test('mapa filtra antes do limite e mantém contagens, tipos e isolamento por grupo',async({request})=>{
  const unfiltered=await request.get(`/api/core/dashboard?${window}`,{headers});
  expect(unfiltered.status()).toBe(200);
  const full=await unfiltered.json();
  expect(full.markers).toHaveLength(1000);expect(full.limited).toBe(true);expect(full.matchingCount).toBe(1006);
  expect(full.availableTypes).toContain('Queda de Árvore');expect(full.availableTypes).not.toContain('FORA DO ESCOPO');
  for(const selection of ['status=RESOLVIDA','type=Queda+de+Árvore&status=RESOLVIDA','priority=ALTA']){
    const result=await request.get(`/api/core/dashboard?${window}&${selection}`,{headers});
    expect(result.status()).toBe(200);
    const filtered=await result.json();
    expect(filtered.markers).toHaveLength(1);expect(filtered.limited).toBe(false);expect(filtered.matchingCount).toBe(1);
    expect(filtered.counts).toEqual(full.counts);
    const expected=selection==='priority=ALTA'?fixture.records[1]:fixture.records[3];
    expect(filtered.markers[0]).toMatchObject({id:expected.id,protocol:expected.protocol,type:expected.type,status:expected.status,priority:expected.priority});
  }
});

test('mapa combina seleções e aceita ocultar todos sem perder opções',async({request})=>{
  const selected=await request.get(`/api/core/dashboard?${window}&status=EM_TRIAGEM&status=CANCELADA&type=Incêndio`,{headers});
  expect(selected.status()).toBe(200);expect((await selected.json()).markers).toHaveLength(2);
  for(const dimension of ['status','priority','type']){
    const response=await request.get(`/api/core/dashboard?${window}&${dimension}=`,{headers});
    expect(response.status()).toBe(200);
    const body=await response.json();
    expect(body.markers).toEqual([]);expect(body.matchingCount).toBe(0);expect(body.availableTypes).toContain('Incêndio');
  }
});

test('mapa rejeita filtros inválidos e acesso sem sessão',async({request})=>{
  expect((await request.get('/api/core/dashboard')).status()).toBe(401);
  expect((await request.get('/api/core/dashboard?status=INVALID',{headers})).status()).toBe(422);
});
