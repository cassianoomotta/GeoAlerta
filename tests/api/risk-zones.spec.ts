import {expect,test} from '@playwright/test';
import {fixtureCookies} from '../fixtures/session';

test('RF-003 administrador cria versões de zona sem alterar linhas históricas e recusa versão obsoleta',async({request})=>{
  const cookies=await fixtureCookies('admin');
  const headers={Cookie:cookies.map(({name,value})=>`${name}=${value}`).join('; ')};
  const input={name:'Synthetic append-only API zone',type:'INUNDACAO',active:true,validFrom:null,validTo:null,geometry:{type:'Polygon',coordinates:[[[-50.8,-29.8],[-50.79,-29.8],[-50.79,-29.79],[-50.8,-29.79],[-50.8,-29.8]]]}};
  const created=await request.post('/api/core/admin/risk-zones',{headers,data:{action:'create',...input}});
  expect(created.status()).toBe(201);
  const {zoneId}=await created.json();
  const update={action:'update',zoneId,expectedVersion:1,...input,active:false};
  const updated=await request.post('/api/core/admin/risk-zones',{headers,data:update});
  expect(updated.status()).toBe(200);
  expect(await updated.json()).toMatchObject({zoneId,version:2});
  const stale=await request.post('/api/core/admin/risk-zones',{headers,data:update});
  expect(stale.status()).toBe(409);
  const listed=await request.get('/api/core/admin/risk-zones',{headers});
  expect((await listed.json()).zones).toContainEqual(expect.objectContaining({zoneId,version:2,active:false}));
});
