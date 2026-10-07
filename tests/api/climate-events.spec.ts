import { expect, test } from '@playwright/test';
import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { assertTestTarget } from '../fixtures/database';
import { fixtureCookies } from '../fixtures/session';

const createdIds: string[] = [];
const intakeOccurrenceIds: string[]=[];
const intakeKeys: string[]=[];
const cookieHeader = (cookies: { name: string; value: string }[]) => cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
const headersFor = async (name: string) => ({ Cookie: cookieHeader(await fixtureCookies(name)) });

test.afterAll(async () => {
  if (!createdIds.length) return;
  assertTestTarget(process.env.TEST_DATABASE_URL);
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  try {
    if(intakeOccurrenceIds.length){
      await db.query('DELETE FROM public.occurrence_alerts WHERE occurrence_id=ANY($1::uuid[])',[intakeOccurrenceIds]);
      await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=ANY($1::uuid[])',[intakeOccurrenceIds]);
      await db.query('DELETE FROM public.occurrence_events WHERE occurrence_id=ANY($1::uuid[])',[intakeOccurrenceIds]);
      await db.query('DELETE FROM public.occurrence_private_data WHERE occurrence_id=ANY($1::uuid[])',[intakeOccurrenceIds]);
      await db.query('DELETE FROM public.idempotency_keys WHERE key=ANY($1::text[])',[intakeKeys]);
      await db.query('DELETE FROM public.audit_events WHERE entity_id=ANY($1::uuid[])',[intakeOccurrenceIds]);
      await db.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])',[intakeOccurrenceIds]);
    }
    await db.query('DELETE FROM public.audit_events WHERE entity_id=ANY($1::uuid[])', [createdIds]);
    await db.query('DELETE FROM public.climate_events WHERE id=ANY($1::uuid[])', [createdIds]);
  } finally { await db.end(); }
});

test('CLIMATE-API public intake binds the active event and replay preserves the persisted link after rotation', async ({ request }) => {
  const headers=await headersFor('gestor');const token=randomUUID();
  const create=async(name:string)=>{
    const response=await request.post('/api/core/climate-events',{headers,data:{action:'create',name:`${name} ${token.slice(0,6)}`,plannedStart:'2026-10-06',plannedEnd:'2026-10-08'}});
    expect(response.status()).toBe(201);const event=await response.json();createdIds.push(event.id);return event;
  };
  const start=async(event:{id:string;version:number})=>{
    const response=await request.post('/api/core/climate-events',{headers,data:{action:'start',id:event.id,expectedVersion:event.version}});expect(response.status()).toBe(200);return await response.json() as {id:string;version:number};
  };
  const first=await create('Intake event A');const active=await start(first);
  const key=randomUUID();intakeKeys.push(key);
  const input={type:'Alagamentos/Inundação',description:`Synthetic climate intake ${token}`,reporterName:'Synthetic citizen',reporterContact:'Synthetic contact',position:{latitude:11,longitude:11,accuracy:7}};
  try{
    const initial=await request.post('/api/core/public/occurrences',{headers:{'Idempotency-Key':key},data:input});expect(initial.status()).toBe(201);const result=await initial.json();intakeOccurrenceIds.push(result.id);
    const hiddenBlock=await request.post('/api/core/climate-events',{headers,data:{action:'close',id:first.id,expectedVersion:active.version}});
    expect(hiddenBlock.status()).toBe(409);const blockedBody=await hiddenBlock.json();expect(blockedBody.error.message).toContain('fora do escopo');expect(blockedBody.error.outOfScope).toBe(true);expect(JSON.stringify(blockedBody)).not.toContain(result.id);expect(JSON.stringify(blockedBody)).not.toContain(result.protocol);
    const db=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await db.connect();
    try{
      expect((await db.query('SELECT climate_event_id::text FROM public.occurrences WHERE id=$1',[result.id])).rows[0].climate_event_id).toBe(first.id);
      await db.query('BEGIN');await db.query("SET LOCAL session_replication_role='replica'");
      await db.query("UPDATE public.occurrences SET status='RESOLVIDA' WHERE id=$1",[result.id]);await db.query('COMMIT');
    }finally{await db.end();}
    const close=await request.post('/api/core/climate-events',{headers,data:{action:'close',id:first.id,expectedVersion:active.version}});expect(close.status()).toBe(200);
    const second=await create('Intake event B');await start(second);
    const replay=await request.post('/api/core/public/occurrences',{headers:{'Idempotency-Key':key},data:input});expect(replay.status()).toBe(200);expect(await replay.json()).toMatchObject({id:result.id,protocol:result.protocol});
    const dbVerify=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await dbVerify.connect();
    try{expect((await dbVerify.query('SELECT climate_event_id::text FROM public.occurrences WHERE id=$1',[result.id])).rows[0].climate_event_id).toBe(first.id);}
    finally{await dbVerify.end();}
    const adminHeaders=await headersFor('admin');
    const detail=await request.get(`/api/core/occurrences/${result.id}`,{headers:adminHeaders});expect(detail.status()).toBe(200);const current=await detail.json();
    const managerDetail=await request.get(`/api/core/occurrences/${result.id}`,{headers});expect(managerDetail.status()).toBe(404);
    const planned=await create('Planned link rejection');
    const rejected=await request.patch(`/api/core/occurrences/${result.id}`,{headers:adminHeaders,data:{expectedVersion:current.version,command:{kind:'climateEvent',climateEventId:planned.id,reason:'Verificação de vínculo planejado.'}}});expect(rejected.status()).toBe(422);
    const afterRejected=await request.get(`/api/core/occurrences/${result.id}`,{headers:adminHeaders});expect((await afterRejected.json()).version).toBe(current.version);
    const moved=await request.patch(`/api/core/occurrences/${result.id}`,{headers:adminHeaders,data:{expectedVersion:current.version,command:{kind:'climateEvent',climateEventId:second.id,reason:'Correção para o novo evento ativo.'}}});expect(moved.status()).toBe(200);
    const filtered=await request.get(`/api/core/occurrences?climateEventId=${second.id}`,{headers:adminHeaders});expect(filtered.status()).toBe(200);
    const filteredBody=await filtered.json();expect(filteredBody.items).toEqual(expect.arrayContaining([expect.objectContaining({id:result.id,climateEventId:second.id,climateEventName:second.name})]));
    const csv=await request.get(`/api/core/occurrences/export?climateEventId=${second.id}`,{headers:adminHeaders});expect(csv.status()).toBe(200);const csvBody=await csv.text();
    expect(csvBody).toContain('ID do evento climático');expect(csvBody).toContain('Evento climático');expect(csvBody).toContain(second.id);expect(csvBody).toContain(second.name);
    const unlink=await request.patch(`/api/core/occurrences/${result.id}`,{headers:adminHeaders,data:{expectedVersion:current.version+1,command:{kind:'climateEvent',climateEventId:null,reason:'Remoção após conferência histórica.'}}});expect(unlink.status()).toBe(200);
    const unlinked=await request.get('/api/core/occurrences?climateEventId=__NULL__',{headers:adminHeaders});expect((await unlinked.json()).items).toEqual(expect.arrayContaining([expect.objectContaining({id:result.id,climateEventId:null,climateEventName:null})]));
    const auditDb=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await auditDb.connect();
    try{
      const history=await auditDb.query("SELECT kind,reason,changes->'climateEventId' AS link FROM public.occurrence_events WHERE occurrence_id=$1 AND kind='CLIMATE_EVENT_LINK_CHANGED' ORDER BY at,id",[result.id]);
      expect(history.rows).toHaveLength(2);expect(history.rows[0].reason).toBe('Correção para o novo evento ativo.');expect(history.rows[0].link).toEqual({from:first.id,to:second.id});expect(history.rows[1].reason).toBe('Remoção após conferência histórica.');expect(history.rows[1].link).toEqual({from:second.id,to:null});
      expect((await auditDb.query("SELECT count(*)::int AS n FROM public.audit_events WHERE entity_id=$1 AND kind='OCCURRENCE_CLIMATE_EVENT_LINK_CHANGED'",[result.id])).rows[0].n).toBe(2);
    }finally{await auditDb.end();}
    const secondClose=await request.post('/api/core/climate-events',{headers,data:{action:'close',id:second.id,expectedVersion:2}});expect(secondClose.status()).toBe(200);
  } catch(error) { throw error; }
});

test('CLIMATE-API active manager creates, starts, and closes versioned municipal events', async ({ request }) => {
  const headers = await headersFor('gestor');
  const firstIdempotency = randomUUID();
  const created = await request.post('/api/core/climate-events', {
    headers, data: { action: 'create', name: `Evento sintético ${firstIdempotency.slice(0, 8)}`, plannedStart: '2026-10-06', plannedEnd: '2026-10-08' },
  });
  expect(created.status()).toBe(201);
  const event = await created.json();
  createdIds.push(event.id);
  expect(event).toMatchObject({ state: 'PLANEJADO', version: 1, municipalityId: 'sa_patrulha' });
  expect(event.createdBy).toBeUndefined();

  const started = await request.post('/api/core/climate-events', {
    headers, data: { action: 'start', id: event.id, expectedVersion: event.version },
  });
  expect(started.status()).toBe(200);
  const active = await started.json();
  expect(active).toMatchObject({ id: event.id, state: 'EM_ANDAMENTO', version: 2 });
  expect(active.startedAt).toBeTruthy();
  const stale = await request.post('/api/core/climate-events', {
    headers, data: { action: 'update', id: event.id, expectedVersion: 1, name: 'Nome desatualizado', plannedStart: '2026-10-06', plannedEnd: '2026-10-08' },
  });
  expect(stale.status()).toBe(409);

  const second = await request.post('/api/core/climate-events', {
    headers, data: { action: 'create', name: `Segundo evento ${firstIdempotency.slice(0, 8)}`, plannedStart: '2026-10-06', plannedEnd: '2026-10-08' },
  });
  expect(second.status()).toBe(201);
  const planned = await second.json();
  createdIds.push(planned.id);
  const competingStart = await request.post('/api/core/climate-events', {
    headers, data: { action: 'start', id: planned.id, expectedVersion: planned.version },
  });
  expect(competingStart.status()).toBe(409);

  const closed = await request.post('/api/core/climate-events', {
    headers, data: { action: 'close', id: event.id, expectedVersion: active.version },
  });
  expect(closed.status()).toBe(200);
  expect(await closed.json()).toMatchObject({ state: 'ENCERRADO', version: 3 });

  const contenders = await Promise.all(['Concorrente A', 'Concorrente B'].map(async contender => {
    const response = await request.post('/api/core/climate-events', { headers, data: { action: 'create', name: `${contender} ${firstIdempotency.slice(0, 6)}`, plannedStart: '2026-10-06', plannedEnd: '2026-10-08' } });
    expect(response.status()).toBe(201); const plannedEvent = await response.json(); createdIds.push(plannedEvent.id);
    const start = await request.post('/api/core/climate-events', { headers, data: { action: 'start', id: plannedEvent.id, expectedVersion: plannedEvent.version } });
    return { id: plannedEvent.id, response: start };
  }));
  expect(contenders.map(item => item.response.status()).sort()).toEqual([200, 409]);
  const winner = contenders.find(item => item.response.status() === 200)!;
  const winnerEvent = await winner.response.json();
  const finalClose = await request.post('/api/core/climate-events', { headers, data: { action: 'close', id: winner.id, expectedVersion: winnerEvent.version } });
  expect(finalClose.status()).toBe(200);
});

test('CLIMATE-API serializes active-event resolution with a concurrent event close', async ({ request }) => {
  const headers=await headersFor('gestor');
  const created=await request.post('/api/core/climate-events',{headers,data:{action:'create',name:`Close race ${randomUUID().slice(0,8)}`,plannedStart:'2026-10-06',plannedEnd:'2026-10-08'}});
  expect(created.status()).toBe(201);const event=await created.json();createdIds.push(event.id);
  const started=await request.post('/api/core/climate-events',{headers,data:{action:'start',id:event.id,expectedVersion:event.version}});
  expect(started.status()).toBe(200);const active=await started.json();

  const closer=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await closer.connect();
  await closer.query('BEGIN');await closer.query('SET LOCAL ROLE geoalerta_runtime');
  await closer.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",[ '10000000-0000-4000-8000-000000000003',JSON.stringify({sub:'10000000-0000-4000-8000-000000000003'}) ]);
  await closer.query("UPDATE public.climate_events SET state='ENCERRADO',version=version+1 WHERE id=$1 AND version=$2",[event.id,active.version]);
  const key=randomUUID();intakeKeys.push(key);
  const input={type:'Alagamentos/Inundação',description:`Synthetic close race ${key.slice(0,8)}`,reporterName:'Synthetic citizen',reporterContact:'Synthetic contact',position:{latitude:11,longitude:11,accuracy:7}};
  const intake=request.post('/api/core/public/occurrences',{headers:{'Idempotency-Key':key},data:input});
  const observer=new pg.Client({connectionString:process.env.TEST_DATABASE_URL});await observer.connect();
  try{
    let waiting=false;const deadline=Date.now()+5000;
    while(Date.now()<deadline&&!waiting){
      const result=await observer.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE wait_event_type='Lock' AND query LIKE '%pg_advisory_xact_lock%') AS waiting");
      waiting=result.rows[0].waiting;
      if(!waiting)await new Promise(resolve=>setTimeout(resolve,25));
    }
    expect(waiting,'public intake should wait for the close transaction municipality lock').toBe(true);
    await closer.query('COMMIT');
    const response=await intake;expect(response.status()).toBe(201);const result=await response.json();intakeOccurrenceIds.push(result.id);
    const verify=await observer.query('SELECT climate_event_id::text FROM public.occurrences WHERE id=$1',[result.id]);
    expect(verify.rows[0].climate_event_id).toBeNull();
  }catch(error){
    await closer.query('ROLLBACK').catch(()=>undefined);throw error;
  }finally{await observer.end();await closer.end();}
});

test('CLIMATE-API only active managers can create and command payloads cannot widen scope', async ({ request }) => {
  const command = { action: 'create', name: 'Tentativa sintética', plannedStart: '2026-10-06', plannedEnd: '2026-10-07' };
  for (const name of ['operador', 'consulta', 'pendente', 'suspenso', 'desativado', 'outromunicipio']) {
    const response = await request.post('/api/core/climate-events', { headers: await headersFor(name), data: command });
    expect(response.status(), name).toBe(403);
  }
  const administrator=await request.post('/api/core/climate-events',{headers:await headersFor('admin'),data:{...command,name:'Cadastro autorizado de administrador'}});
  expect(administrator.status()).toBe(201);const adminEvent=await administrator.json();createdIds.push(adminEvent.id);
  const spoofed = await request.post('/api/core/climate-events', {
    headers: await headersFor('gestor'), data: { ...command, municipalityId: 'other', state: 'EM_ANDAMENTO' },
  });
  expect(spoofed.status()).toBe(422);
  const anonymous = await request.get('/api/core/climate-events');
  expect(anonymous.status()).toBe(401);
});
