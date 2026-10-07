import {test,expect,type APIRequestContext} from '@playwright/test';
import pg from 'pg';
import {fixtureCookies} from '../fixtures/session';
import {listType} from '../fixtures/list';
import {accounts,groupA,groupB,groupOther,occurrenceA,occurrenceB} from '../fixtures/access';
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
      const expected=(await db.query(`SELECT id FROM public.occurrences WHERE type=$1 AND group_id=$2 AND deleted_at IS NULL AND created_at>='2025-01-02T00:00:00Z' AND created_at<'2025-01-04T00:00:00Z' AND status='NOVA' AND priority='ALTA' ORDER BY ${field} ${direction},id ASC`,[listType(),groupA])).rows;
      expect(result.total).toBe(expected.length);expect(result.items.map((i:{id:string})=>i.id)).toEqual(expected.map(i=>i.id));
    }
    expect((await(await query(request,'operador',{type:'absent-fixture-type'})).json()).total).toBe(0);
  }finally{await db.end();}
});
test('filtro de origem restringe lista e CSV sem remover registros históricos sem origem',async({request})=>{
  const db=await database();
  let previous:{id:string;protocol:string;registration_channel:string|null;location_source:string|null;accuracy:number|null}[]=[];
  try{
    previous=(await db.query('SELECT id,protocol,registration_channel,location_source,accuracy FROM public.occurrences WHERE id=ANY($1::uuid[])',[ [occurrenceA,occurrenceB] ])).rows;
    await db.query("UPDATE public.occurrences SET registration_channel=CASE WHEN id=$1 THEN 'BATALHAO' ELSE NULL END,location_source=CASE WHEN id=$1 THEN 'MAPA' ELSE NULL END,accuracy=CASE WHEN id=$1 THEN NULL ELSE accuracy END WHERE id=ANY($2::uuid[])",[occurrenceA,[occurrenceA,occurrenceB]]);

    const battalion=await query(request,'gestor',{type:'fixture',registrationChannel:'BATALHAO',pageSize:'100'});
    expect(battalion.status()).toBe(200);
    const result=await battalion.json();
    expect(result.total).toBe(1);
    expect(result.items.map((item:{id:string})=>item.id)).toEqual([occurrenceA]);

    const unidentified=await query(request,'gestor',{type:'fixture',registrationChannel:'__NULL__',pageSize:'100'});
    expect(unidentified.status()).toBe(200);
    expect((await unidentified.json()).items.map((item:{id:string})=>item.id)).toEqual([occurrenceB]);

    const cookies=await fixtureCookies('gestor');
    const exported=await request.get('/api/core/occurrences/export?'+new URLSearchParams({type:'fixture',registrationChannel:'BATALHAO',columns:'protocol'}),{headers:{Cookie:cookies.map(cookie=>`${cookie.name}=${cookie.value}`).join('; ')}});
    expect(exported.status()).toBe(200);
    expect(exported.headers()['x-exported-count']).toBe('1');
    expect(await exported.text()).toContain(`\"${previous.find(item=>item.id===occurrenceA)!.protocol}\"`);
  }finally{
    for(const item of previous)await db.query('UPDATE public.occurrences SET registration_channel=$1,location_source=$2,accuracy=$3 WHERE id=$4',[item.registration_channel,item.location_source,item.accuracy,item.id]);
    await db.end();
  }
});
test('RF-009 filtros categóricos usam códigos exatos e valores desconhecidos são rejeitados',async({request})=>{
  const db=await database();
  const recordId='92000000-0000-4000-8000-000000000022';
  let previous:{registering_institution_code:string|null;neighborhood_code:string|null;locality_code:string|null;occurrence_situation:string|null;damage_location_code:string|null;damage_location_detail:string|null;has_victims:boolean|null;has_displaced:boolean|null}|undefined;
  try{
    previous=(await db.query('SELECT registering_institution_code,neighborhood_code,locality_code,occurrence_situation,damage_location_code,damage_location_detail,has_victims,has_displaced FROM public.occurrences WHERE id=$1',[occurrenceA])).rows[0];
    await db.query(`UPDATE public.occurrences SET registering_institution_code='CIDADAO',neighborhood_code='CENTRO',locality_code='PINHEIRINHOS_4D',occurrence_situation='EM_RISCO',damage_location_code='OUTROS',damage_location_detail='Fixture',has_victims=NULL,has_displaced=false WHERE id=$1`,[occurrenceA]);
    await db.query('BEGIN');
    const operator=accounts.find(account=>account.name==='operador')!;
    await db.query('SELECT set_config($1,$2,true),set_config($3,$4,true)',['request.jwt.claim.sub',operator.id,'request.jwt.claims',JSON.stringify({sub:operator.id})]);
    await db.query(`INSERT INTO public.occurrence_service_records(id,occurrence_id,agency_code,attending_person,attended_at,action) VALUES($1,$2,'DEFESA_CIVIL','Filtro fixture','2026-10-02T15:30:00Z','Filtro fixture') ON CONFLICT(id) DO NOTHING`,[recordId,occurrenceA]);
    await db.query('COMMIT');
    const params={registeringInstitutionCode:'CIDADAO',neighborhoodCode:'CENTRO',localityCode:'PINHEIRINHOS_4D',situation:'EM_RISCO',damageLocationCode:'OUTROS',hasVictims:'__NULL__',hasDisplaced:'false',agencyCode:'DEFESA_CIVIL'};
    const response=await query(request,'operador',{type:'fixture',...params});
    expect(response.status()).toBe(200);
    const result=await response.json();
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(occurrenceA);
    expect((await query(request,'operador',{neighborhoodCode:'CENTRO%'})).status()).toBe(422);
    expect((await query(request,'operador',{neighborhoodCode:'NAO_EXISTE'})).status()).toBe(422);
  }finally{
    await db.query('DELETE FROM public.occurrence_service_records WHERE id=$1',[recordId]);
    if(previous)await db.query(`UPDATE public.occurrences SET registering_institution_code=$1,neighborhood_code=$2,locality_code=$3,occurrence_situation=$4,damage_location_code=$5,damage_location_detail=$6,has_victims=$7,has_displaced=$8 WHERE id=$9`,[previous.registering_institution_code,previous.neighborhood_code,previous.locality_code,previous.occurrence_situation,previous.damage_location_code,previous.damage_location_detail,previous.has_victims,previous.has_displaced,occurrenceA]);
    await db.end();
  }
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
  const consulta=await(await query(request,'consulta')).json();expect(consulta.availableColumns).toContain('needsMedicalSupport');expect(consulta.availableColumns).not.toContain('reporterName');expect(consulta.items.every((i:Record<string,unknown>)=>'needsMedicalSupport'in i)).toBe(true);expect(JSON.stringify(consulta)).not.toContain('Synthetic private');expect(consulta.items.every((i:Record<string,unknown>)=>!('reporterName'in i)&&!('reporterContact'in i))).toBe(true);
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
