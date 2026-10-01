import { test,expect } from '@playwright/test';
import pg from 'pg';
import { fixtureCookies } from '../fixtures/session';
import { accounts,occurrenceA,occurrenceB,occurrenceOther } from '../fixtures/access';
import { assertTestTarget } from '../fixtures/database';
test('RNF-001 API combina capacidade e grupo sem aceitar papel do cliente',async({request})=>{
  for(const name of ['consulta','operador','gestor','admin']){
    const headers={Cookie:cookieHeader(await fixtureCookies(name))};
    for(const cap of ['read','privateData','operate','reclassify','export','administer']){
      const ok=name==='admin'||name==='gestor'&&cap!=='administer'||name==='operador'&&['read','privateData','operate'].includes(cap)||name==='consulta'&&cap==='read';
      expect((await request.get(`/api/core/access?capability=${cap}`,{headers})).status(),`${name}/${cap}`).toBe(ok?200:403);
    }
  }
});
const cookieHeader=(cookies:{name:string;value:string}[])=>cookies.map(c=>`${c.name}=${c.value}`).join('; ');
test('RF-005 identidade ausente e cookie adulterado são 401',async({request})=>{
  for(const headers of [{},{Cookie:'sb-127-auth-token=invalid'}] as Record<string,string>[]){
    const r=await request.get('/api/core/session',{headers});expect(r.status()).toBe(401);expect(await r.json()).toEqual({error:{code:'UNAUTHENTICATED',message:'Autenticação necessária.'}});
  }
});
test('RF-005 matriz atual de estados grupos e município; metadata forjada não concede papel',async({request})=>{
  for(const a of accounts){
    const r=await request.get('/api/core/session',{headers:{Cookie:cookieHeader(await fixtureCookies(a.name)),'X-Role':'ADMINISTRADOR','X-Groups':'all'}});
    const granted=['consulta','operador','gestor','admin'].includes(a.name);expect(r.status(),a.name).toBe(granted?200:403);
    if(granted){const body=await r.json();expect(body.role).toBe(a.role);expect(body.groupIds.sort()).toEqual([...a.groups].sort());}
    else expect(JSON.stringify(await r.json())).not.toContain('Private fixture');
  }
});
test('RF-005 ID fora do escopo é 404 igual a inexistente; nenhuma informação privada',async({request})=>{
  const headers={Cookie:cookieHeader(await fixtureCookies('operador'))};
  expect((await request.get(`/api/core/occurrences/${occurrenceA}`,{headers})).status()).toBe(200);
  for(const id of [occurrenceB,occurrenceOther,'40000000-0000-4000-8000-000000000001']){
    const r=await request.get(`/api/core/occurrences/${id}`,{headers});expect(r.status()).toBe(404);expect(await r.json()).toEqual({error:{code:'NOT_FOUND',message:'Registro não encontrado.'}});
  }
  const consulta=await request.get(`/api/core/occurrences/${occurrenceA}`,{headers:{Cookie:cookieHeader(await fixtureCookies('consulta'))}});
  expect(consulta.status()).toBe(200);expect(Object.keys(await consulta.json()).sort()).toEqual(['classification','description','events','group','id','openedAt','position','priority','protocol','status','type','updatedAt','version']);
});
test('RF-005 sessão emitida perde acesso após suspensão e alteração de papel/grupos',async({request})=>{
  assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
  const a=accounts.find(a=>a.name==='operador')!;const headers={Cookie:cookieHeader(await fixtureCookies(a.name))};
  try{
    expect((await request.get('/api/core/session',{headers})).status()).toBe(200);
    await db.query("UPDATE public.admin_profiles SET state='SUSPENSO' WHERE user_id=$1",[a.id]);
    expect((await request.get('/api/core/session',{headers})).status()).toBe(403);
    expect((await request.get(`/api/core/occurrences/${occurrenceA}`,{headers})).status()).toBe(403);
    await db.query("UPDATE public.admin_profiles SET state='ATIVO',role='CONSULTA' WHERE user_id=$1",[a.id]);
    expect((await(await request.get('/api/core/session',{headers})).json()).role).toBe('CONSULTA');
  }finally{await db.query("UPDATE public.admin_profiles SET state='ATIVO',role='OPERADOR' WHERE user_id=$1",[a.id]);await db.end();}
});
