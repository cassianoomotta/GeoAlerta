import {test,expect,type APIRequestContext} from '@playwright/test';
import pg from 'pg';
import {fixtureCookies} from '../fixtures/session';
import {listType} from '../fixtures/list';
import {accounts,groupA,groupB,groupOther} from '../fixtures/access';
import {assertTestTarget} from '../fixtures/database';
import {publicColumns} from '../../src/features/occurrences/list-input';
const path='/api/core/occurrences';
const headers=async(name:string)=>({Cookie:(await fixtureCookies(name)).map(c=>`${c.name}=${c.value}`).join('; ')});
async function query(request:APIRequestContext,name:string,params:Record<string,string>={}){return request.get(`${path}?${new URLSearchParams({type:listType(),...params})}`,{headers:await headers(name)});}
async function database(){assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();return db;}
test('RF-009 paginação default total estável desempate por ID e exclusão lógica',async({request})=>{
  const pages=[];for(const page of ['1','2','3']){const r=await query(request,'operador',{page});expect(r.status()).toBe(200);pages.push(await r.json());}
  expect(pages.map(p=>p.items.length)).toEqual([50,50,25]);expect(pages.every(p=>p.total===125)).toBe(true);
  expect(pages.map(p=>p.page)).toEqual([1,2,3]);expect(pages.every(p=>p.pageSize===50)).toBe(true);expect(pages[0].items[0].version).toBe(1);expect(Number.isFinite(Date.parse(pages[0].items[0].updatedAt))).toBe(true);
  const ids=pages.flatMap(p=>p.items.map((i:{id:string})=>i.id));expect(new Set(ids).size).toBe(125);
  const db=await database();try{expect(ids).toEqual((await db.query('SELECT id FROM public.occurrences WHERE type=$1 AND group_id=$2 AND deleted_at IS NULL ORDER BY created_at DESC,id ASC',[listType(),groupA])).rows.map(r=>r.id));}finally{await db.end();}
  const beyond=await(await query(request,'operador',{page:'4'})).json();expect(beyond.items).toEqual([]);expect(beyond.total).toBe(125);
});
test('RF-008 filtros e ordenações coincidem com consulta independente no PostGIS',async({request})=>{
  const db=await database();
  try{
    for(const sort of ['createdAt','priority','status'])for(const direction of ['asc','desc']){
      const result=await(await query(request,'operador',{from:'2025-01-02',to:'2025-01-03',status:'NOVA',priority:'ALTA',groupId:groupA,sort,direction,pageSize:'100'})).json();
      const field={createdAt:'created_at',priority:'priority',status:'status'}[sort];
      const expected=(await db.query(`SELECT id FROM public.occurrences WHERE type=$1 AND group_id=$2 AND deleted_at IS NULL AND created_at>='2025-01-02T00:00:00Z' AND created_at<='2025-01-03T23:59:59.999Z' AND status='NOVA' AND priority='ALTA' ORDER BY ${field} ${direction},id ASC`,[listType(),groupA])).rows;
      expect(result.total).toBe(expected.length);expect(result.items.map((i:{id:string})=>i.id)).toEqual(expected.map(i=>i.id));
    }
    expect((await(await query(request,'operador',{type:'absent-fixture-type'})).json()).total).toBe(0);
  }finally{await db.end();}
});
test('RF-009 situação da categoria filtra o catálogo sem apagar o histórico',async({request})=>{
  const db=await database();
  try{
    const active=await query(request,'operador',{categoryStatus:'active'});
    expect(active.status()).toBe(200);expect((await active.json()).total).toBe(125);
    await db.query('UPDATE public.occurrence_types SET active=false WHERE name=$1',[listType()]);
    const inactive=await query(request,'operador',{categoryStatus:'inactive'});
    expect(inactive.status()).toBe(200);expect((await inactive.json()).total).toBe(125);
    expect((await query(request,'operador',{categoryStatus:'active'})).status()).toBe(200);
    expect((await(await query(request,'operador',{categoryStatus:'active'})).json()).total).toBe(0);
  }finally{await db.query('UPDATE public.occurrence_types SET active=true WHERE name=$1',[listType()]);await db.end();}
});
test('RNF-001 manipulação de grupo tamanho sort colunas e identidade não amplia acesso',async({request})=>{
  expect((await request.get(path)).status()).toBe(401);
  for(const name of ['pendente','suspenso','semgrupo','outromunicipio'])expect((await query(request,name)).status()).toBe(403);
  for(const params of [{groupId:groupB},{groupId:groupOther}])expect((await query(request,'operador',params)).status()).toBe(403);
  for(const params of [{pageSize:'101'},{sort:'reporter_name'},{columns:'protocol,reporterName'},{columns:'photo_url'},{groupId:'all'}] as Record<string,string>[])expect((await query(request,'consulta',params)).status()).toBe(422);
  for(const name of ['gestor','admin'])expect((await(await query(request,name,{pageSize:'100'})).json()).total).toBe(133);
  const consulta=await(await query(request,'consulta')).json();expect(consulta.availableColumns).not.toContain('reporterName');expect(JSON.stringify(consulta)).not.toContain('Synthetic private');expect(consulta.items.every((i:Record<string,unknown>)=>!('reporterName'in i)&&!('reporterContact'in i))).toBe(true);
  const operator=await(await query(request,'operador',{columns:'protocol,reporterName,reporterContact'})).json();expect(operator.items[0].reporterName).toBe('Synthetic private name');expect(operator.items[0].reporterContact).toBe('Synthetic private contact');
});
test('RF-009 preferências persistem por conta e rebaixamento remove colunas privadas',async({request})=>{
  const operatorHeaders=await headers('operador'),gestorHeaders=await headers('gestor');const db=await database();const account=accounts.find(a=>a.name==='operador')!;
  try{
    expect((await request.put('/api/core/preferences/columns',{headers:operatorHeaders,data:{columns:['protocol','reporterName']}})).status()).toBe(200);
    expect((await request.put('/api/core/preferences/columns',{headers:gestorHeaders,data:{columns:['protocol','status']}})).status()).toBe(200);
    expect((await(await query(request,'operador')).json()).columns).toEqual(['protocol','reporterName']);expect((await(await query(request,'gestor')).json()).columns).toEqual(['protocol','status']);
    expect((await(await query(request,'consulta')).json()).columns).toEqual(publicColumns);
    expect((await request.put('/api/core/preferences/columns',{headers:operatorHeaders,data:{columns:['protocol'],userId:accounts[0].id}})).status()).toBe(422);
    expect((await request.put('/api/core/preferences/columns',{headers:await headers('consulta'),data:{columns:['protocol','reporterContact']}})).status()).toBe(422);
    expect((await request.put('/api/core/preferences/columns',{headers:operatorHeaders,data:{columns:['photo_url']}})).status()).toBe(422);
    await db.query("UPDATE public.admin_profiles SET role='CONSULTA' WHERE user_id=$1",[account.id]);
    const downgraded=await(await query(request,'operador')).json();expect(downgraded.columns).toEqual(['protocol']);expect(JSON.stringify(downgraded)).not.toContain('reporterName');expect(JSON.stringify(downgraded)).not.toContain('Synthetic private');
  }finally{await db.query("UPDATE public.admin_profiles SET role='OPERADOR' WHERE user_id=$1",[account.id]);for(const name of ['operador','gestor'])await request.put('/api/core/preferences/columns',{headers:await headers(name),data:{columns:publicColumns}});await db.end();}
});
