import {test,expect} from '@playwright/test';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {assertTestTarget} from '../fixtures/database';
const path='/api/core/public/occurrences';
const typesPath='/api/core/public/occurrence-types';
const input={type:'Alagamentos/Inundação',description:'synthetic <script>alert(1)</script>',reporterName:'Synthetic citizen',reporterContact:'Synthetic contact',position:{latitude:11,longitude:11,accuracy:7}};
async function database(){assertTestTarget(process.env.TEST_DATABASE_URL);const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();return db;}
test.beforeEach(async({request})=>{await request.post('/__fixture/rotate-origin');});
test('RF-001 catálogo público reflete ativação e recusa tipo desativado no envio',async({request})=>{
  const db=await database();const name=`Tipo fixture ${randomUUID()}`;
  try{
    await db.query('INSERT INTO public.occurrence_types(name,active,display_order) VALUES($1,true,32767)',[name]);
    const active=await request.get(typesPath);expect(active.status()).toBe(200);expect((await active.json()).types).toContain(name);
    await db.query('UPDATE public.occurrence_types SET active=false WHERE name=$1',[name]);
    const inactive=await request.get(typesPath);expect(inactive.status()).toBe(200);expect((await inactive.json()).types).not.toContain(name);
    const rejected=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,type:name}});expect(rejected.status()).toBe(422);
  }finally{await db.query('DELETE FROM public.occurrence_types WHERE name=$1',[name]);await db.end();}
});
test('RF-001 valida entrada sem gravar, sem confiar em prioridade/grupo do cidadão',async({request})=>{
  for(const data of [{...input,priority:'ALTA'},{...input,groupId:randomUUID()},{...input,reporterContact:''},{...input,position:{...input.position,latitude:91}},{...input,position:null}])expect((await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data})).status()).toBe(422);
  expect((await request.post(path,{data:input})).status()).toBe(422);
  expect((await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:'x'.repeat(17000)})).status()).toBe(422);
});
test('RF-001 confirmação ocorre após ocorrência privada evento auditoria alerta e GPS persistidos',async({request})=>{
  const response=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:input});expect(response.status()).toBe(201);const result=await response.json();
  expect(result).toMatchObject({status:'NOVA',priority:'NORMAL',version:1});expect(result.protocol).toMatch(/^\d+$/);
  const db=await database();try{
    const row=(await db.query('SELECT o.status,o.priority,o.accuracy,o.description,o.needs_medical_support,g.is_default,ST_X(o.location::geometry) AS longitude,ST_Y(o.location::geometry) AS latitude,ST_SRID(o.location::geometry) AS srid FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id WHERE o.id=$1',[result.id])).rows[0];
    expect(row).toEqual({status:'NOVA',priority:'NORMAL',accuracy:7,description:input.description,needs_medical_support:null,is_default:true,longitude:11,latitude:11,srid:4326});
    expect((await db.query('SELECT reporter_name,reporter_contact FROM public.occurrence_private_data WHERE occurrence_id=$1',[result.id])).rows[0]).toEqual({reporter_name:input.reporterName,reporter_contact:input.reporterContact});
    for(const [table,field] of [['occurrence_events','occurrence_id'],['audit_events','entity_id'],['occurrence_alerts','occurrence_id']])expect((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE ${field}=$1`,[result.id])).rows[0].n).toBe(1);
  }finally{await db.end();}
});
test('apoio médico persiste true e false e rejeita valores fora do contrato',async({request})=>{
  const db=await database();
  try{
    for(const [value,expected] of [[true,true],[false,false]] as const){
      const response=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,needsMedicalSupport:value}});
      expect(response.status()).toBe(201);const result=await response.json();
      expect((await db.query('SELECT needs_medical_support FROM public.occurrences WHERE id=$1',[result.id])).rows[0].needs_medical_support).toBe(expected);
    }
    expect((await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,needsMedicalSupport:'false'}})).status()).toBe(422);
  }finally{await db.end();}
});
test('RF-003 PostGIS inclui borda sobreposição e versão; exclui buraco inativa futura vencida',async({request})=>{
  const db=await database();const zoneIds:string[]=[];
  try{
    // Isolated synthetic coordinates avoid legacy or other test zones.
    const geometry='MULTIPOLYGON(((20 30,24 30,24 34,20 34,20 30),(21 31,21 33,23 33,23 31,21 31)))';
    for(const [active,from,to] of [[true,'2000-01-01',null],[true,'2000-01-01',null],[false,null,null],[true,'2099-01-01',null],[true,null,'2000-01-01']] as const){
      const id=randomUUID();zoneIds.push(id);await db.query('INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry) VALUES($1,2,$2,$3,$4,$5,$6,ST_GeomFromText($7,4326))',[id,'Synthetic zone','FLOOD',active,from,to,geometry]);
    }
    for(const [longitude,latitude,priority,matches] of [[20.5,30.5,'ALTA',2],[20,32,'ALTA',2],[22,32,'NORMAL',0],[25,35,'NORMAL',0]] as const){
      const r=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,needsMedicalSupport:true,position:{latitude,longitude,accuracy:4}}});expect(r.status()).toBe(201);const result=await r.json();expect(result.priority).toBe(priority);
      const classified=(await db.query('SELECT zone_id,zone_version FROM public.occurrence_classification_zones WHERE occurrence_id=$1',[result.id])).rows;expect(classified).toHaveLength(matches);if(matches)expect(classified.map(r=>r.zone_id).sort()).toEqual(zoneIds.slice(0,2).sort());expect(classified.every(r=>r.zone_version===2)).toBe(true);
    }
    // An inactive-only polygon must not elevate priority.
    const id=randomUUID();zoneIds.push(id);await db.query("INSERT INTO public.risk_zones(zone_id,version,name,type,active,geometry) VALUES($1,1,'Inactive only','FLOOD',false,ST_GeomFromText('MULTIPOLYGON(((40 40,42 40,42 42,40 42,40 40)))',4326))",[id]);
    const r=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,position:{latitude:41,longitude:41,accuracy:0}}});expect((await r.json()).priority).toBe('NORMAL');
    for(const [from,to,x] of [['2099-01-01',null,45],[null,'2000-01-01',50]] as const){
      const id=randomUUID();zoneIds.push(id);const wkt=`MULTIPOLYGON(((${x} 40,${x+2} 40,${x+2} 42,${x} 42,${x} 40)))`;
      await db.query("INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry) VALUES($1,1,'Noncurrent fixture','FLOOD',true,$2,$3,ST_GeomFromText($4,4326))",[id,from,to,wkt]);
      const r=await request.post(path,{headers:{'Idempotency-Key':randomUUID()},data:{...input,position:{latitude:41,longitude:x+1,accuracy:0}}});expect(r.status()).toBe(201);expect((await r.json()).priority).toBe('NORMAL');
    }
  }finally{await db.query('UPDATE public.risk_zones SET active=false WHERE zone_id=ANY($1::uuid[])',[zoneIds]);await db.end();}
});
test('RF-001 reenvio concorrente produz um registro evento alerta e conflito sem duplicação',async({request})=>{
  const key=randomUUID();const responses=await Promise.all(Array.from({length:6},()=>request.post(path,{headers:{'Idempotency-Key':key},data:input})));
  expect(responses.map(r=>r.status()).sort()).toEqual([200,200,200,200,200,201]);
  const results=await Promise.all(responses.map(r=>r.json()));expect(new Set(results.map(r=>r.protocol)).size).toBe(1);
  expect((await request.post(path,{headers:{'Idempotency-Key':key},data:{...input,needsMedicalSupport:true}})).status()).toBe(409);
  const db=await database();try{for(const table of ['occurrence_events','occurrence_alerts'])expect((await db.query(`SELECT count(*)::int AS n FROM public.${table} WHERE occurrence_id=$1`,[results[0].id])).rows[0].n).toBe(1);expect((await db.query('SELECT count(*)::int AS n FROM public.occurrences WHERE id=$1',[results[0].id])).rows[0].n).toBe(1);}finally{await db.end();}
});
test('RF-001 falha no último passo reverte ocorrência privado evento auditoria alerta e contador',async({request})=>{
  const db=await database();const key=randomUUID();const fixture=`core_test_fail_${key.replaceAll('-','')}`;
  const tables=['occurrences','occurrence_private_data','occurrence_events','audit_events','occurrence_alerts','idempotency_keys'];
  try{
    // Explicit SQL fault injection confined to this random fixture key.
    await db.query(`CREATE FUNCTION public.${fixture}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.key='${key}' THEN RAISE EXCEPTION 'fixture final-write failure'; END IF; RETURN NEW; END $$`);
    await db.query(`CREATE TRIGGER ${fixture} BEFORE INSERT ON public.idempotency_keys FOR EACH ROW EXECUTE FUNCTION public.${fixture}()`);
    const before=[];for(const table of tables)before.push((await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n);
    const rateBefore=(await db.query('SELECT coalesce(sum(attempts),0)::text AS n FROM public.intake_rate_limits')).rows[0].n;
    const r=await request.post(path,{headers:{'Idempotency-Key':key},data:input});expect(r.status()).toBe(503);expect(JSON.stringify(await r.json())).not.toContain('fixture final-write failure');
    const after=[];for(const table of tables)after.push((await db.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n);expect(after).toEqual(before);
    expect((await db.query('SELECT coalesce(sum(attempts),0)::text AS n FROM public.intake_rate_limits')).rows[0].n).toBe(rateBefore);
  }finally{await db.end();}
});
test('RNF-002 contador compartilhado recusa tentativa 21 e ignora IP forjado/replay',async({request})=>{
  test.setTimeout(90000);const key=randomUUID();
  const first=await request.post(path,{headers:{'Idempotency-Key':key},data:input});expect(first.status()).toBe(201);
  for(let index=0;index<19;index++){const r=await request.post(path,{headers:{'Idempotency-Key':randomUUID(),'X-Forwarded-For':`192.0.2.${index+1}`,'X-Vercel-Forwarded-For':`192.0.2.${index+1}`},data:input});expect(r.status()).toBe(201);}
  expect((await request.post(path,{headers:{'Idempotency-Key':randomUUID(),'X-Forwarded-For':'203.0.113.8'},data:input})).status()).toBe(429);
  expect((await request.post(path,{headers:{'Idempotency-Key':key},data:input})).status()).toBe(200);
});
