import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { appendFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadLocalEnv, projectRoot } from './with-env.mjs';
import { assertLoadTarget, csvRecordCount, loadAcceptance, LOAD_BACKOFFICE_SESSIONS, LOAD_DURATION_MS, LOAD_MINIMUM_HISTORY, LOAD_OCCURRENCES, LOAD_BURST_SIZE, sanitizedReport, scheduleOccurrence, type LoadEvent } from './load-workflow.ts';

type CreatedOccurrence = { id: string; requestStartedAt: number };
const sleep = (duration: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, Math.max(0, duration)));
function pause(duration: number, signal: AbortSignal) {
  return new Promise<void>((resolvePause) => {
    if (signal.aborted) { resolvePause(); return; }
    const timer = setTimeout(finish, Math.max(0, duration));
    function finish() { clearTimeout(timer); signal.removeEventListener('abort', finish); resolvePause(); }
    signal.addEventListener('abort', finish, { once: true });
  });
}

function gitValue(args: string[]): string | null {
  try { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

function safeErrorCode(error: unknown): string {
  if (error instanceof Error && error.name === 'AbortError') return 'TIMEOUT';
  return 'REQUEST_FAILED';
}

async function main() {
  loadLocalEnv();
  const target = assertLoadTarget(process.env);
  const expectedHistory = Number(process.env.CORE_LOAD_EXPECTED_HISTORY);
  if (expectedHistory < LOAD_MINIMUM_HISTORY) throw new Error('FIFTY_THOUSAND_HISTORY_REQUIRED');

  const events: LoadEvent[] = [];
  const occurrences = new Map<string, CreatedOccurrence>();
  const mutationIds = (process.env.CORE_LOAD_MUTATION_OCCURRENCE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean).slice(0, LOAD_BACKOFFICE_SESSIONS);
  const mutated = new Set<number>();
  let expectedVersionConflicts = 0;
  let idempotencyReplays = 0;
  const realtimeArrivals = new Map<string, number>();
  const socketArrivals = new Set<string>();
  const recoveredFirst = new Set<string>();
  const runController = new AbortController();
  const started = Date.now();
  const startedAt = new Date(started).toISOString();
  const realtime = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    accessToken: async () => process.env.CORE_LOAD_REALTIME_TOKEN!,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  await realtime.realtime.setAuth(process.env.CORE_LOAD_REALTIME_TOKEN!);
  const observeAlert=(id:string,source:'socket'|'recovery')=>{
    if(source==='socket')socketArrivals.add(id);
    if(realtimeArrivals.has(id))return;
    if(source==='recovery')recoveredFirst.add(id);
    const arrivedAt=Date.now();realtimeArrivals.set(id,arrivedAt);
    const occurrence=occurrences.get(id);
    if(occurrence)events.push({kind:'alert.endToEnd',elapsedMs:Math.max(0,arrivedAt-occurrence.requestStartedAt)});
  };
  const channel = realtime.channel(`ticket20-load-${randomUUID()}`,{config:{postgres_changes_options:{wait:true}}})
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'occurrence_alerts' }, (payload) => {
      const row = payload.new as { occurrence_id?: string };
      if (!row.occurrence_id) return;
      observeAlert(row.occurrence_id,'socket');
    });

  const subscription = await new Promise<string>((resolveSubscription, rejectSubscription) => {
    const timeout = setTimeout(() => rejectSubscription(new Error('REALTIME_SUBSCRIPTION_TIMEOUT')), 15_000);
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') { clearTimeout(timeout); resolveSubscription(status); }
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timeout); rejectSubscription(new Error('REALTIME_SUBSCRIPTION_FAILED')); }
    });
  });
  if (subscription !== 'SUBSCRIBED') throw new Error('REALTIME_SUBSCRIPTION_FAILED');

  const request = async (kind: string, path: string, options: RequestInit = {}) => {
    const before = Date.now();
    try {
      const response = await fetch(new URL(path, target.baseUrl), { ...options, signal: AbortSignal.any([runController.signal, AbortSignal.timeout(20_000)]) });
      events.push({ kind, elapsedMs: Date.now() - before, status: response.status });
      return response;
    } catch (error) {
      if (runController.signal.aborted) throw error;
      events.push({ kind: `${kind}.error`, elapsedMs: Date.now() - before });
      throw new Error(safeErrorCode(error));
    }
  };

  const occurrenceBody = (index: number) => JSON.stringify({
    type: 'Alagamentos/Inundação', description: `Ticket 20 synthetic load ${process.env.CORE_LOAD_RUN_ID} ${index}`,
    reporterName: 'Synthetic load', reporterContact: '5550102000',
    position: { latitude: target.lat, longitude: target.lon, accuracy: 5 },
  });
  const submit = async (index: number) => {
    const requestStartedAt = Date.now();
    const key = randomUUID();
    const response = await request('occurrence.create', '/api/core/public/occurrences', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: occurrenceBody(index),
    });
    const body = await response.json().catch(() => ({})) as { id?: string; error?: { code?: string } };
    if (!response.ok || !body.id) {
      const code = body.error?.code && /^[A-Z0-9_]{1,40}$/.test(body.error.code) ? body.error.code : 'UNEXPECTED_RESPONSE';
      throw new Error(`OCCURRENCE_CREATE_FAILED_${response.status}_${code}`);
    }
    const record = { id: body.id, requestStartedAt };
    occurrences.set(body.id, record);
    const arrivedAt = realtimeArrivals.get(body.id);
    if (arrivedAt !== undefined) events.push({ kind: 'alert.endToEnd', elapsedMs: Math.max(0, arrivedAt - record.requestStartedAt) });
    if (index === 0) {
      const replayResponses = await Promise.all(Array.from({ length: 2 }, () => request('occurrence.idempotencyReplay', '/api/core/public/occurrences', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key }, body: occurrenceBody(index),
      })));
      const replayBodies = await Promise.all(replayResponses.map((replay) => replay.json() as Promise<{ id?: string }>));
      if (replayResponses.some((replay) => replay.status !== 200) || replayBodies.some((replay) => replay.id !== body.id)) throw new Error('IDEMPOTENCY_REPLAY_MISMATCH');
      idempotencyReplays += replayResponses.length;
    }
  };

  let cursor:string|null=null;
  let recovering:Promise<void>|undefined;
  const recoverAlerts=async()=>{
    const before=Date.now();
    try{
      const {data,error,status}=await realtime.rpc('core_alert_snapshot',{after_cursor:cursor}).abortSignal(AbortSignal.timeout(20_000)).single<{server_time:string;events:unknown[]}>();
      const valid=!error&&data&&typeof data.server_time==='string'&&Array.isArray(data.events);
      events.push({kind:valid?'alert.recovery':'alert.recovery.error',elapsedMs:Date.now()-before,status});
      if(!valid)return;
      cursor=data.server_time;
      for(const row of data.events)if(row&&typeof row==='object'&&'occurrence_id' in row&&typeof row.occurrence_id==='string')observeAlert(row.occurrence_id,'recovery');
    }catch{events.push({kind:'alert.recovery.error',elapsedMs:Date.now()-before});}
  };
  await recoverAlerts();
  const reconciliation=setInterval(()=>{
    if(recovering)return;
    recovering=recoverAlerts().finally(()=>{recovering=undefined;});
  },3000);
  reconciliation.unref();
  const progress = setInterval(() => {
    console.log(JSON.stringify({
      created: occurrences.size,
      alertsReceived: [...occurrences.keys()].filter((id) => realtimeArrivals.has(id)).length,
      socketAlertsReceived: [...occurrences.keys()].filter((id) => socketArrivals.has(id)).length,
      alertsRecovered: [...occurrences.keys()].filter((id) => recoveredFirst.has(id)).length,
      errors:sanitizedReport(events,startedAt,new Date().toISOString()).errors,
      elapsedMinutes: Math.floor((Date.now() - started) / 60_000),
    }));
  }, 60_000);
  progress.unref();

  try {
    const endAt = started + LOAD_DURATION_MS;
    const firstBurst = Array.from({ length: LOAD_BURST_SIZE }, (_, index) => submit(index));
    await Promise.all(firstBurst);
    const nextOccurrence = (async () => {
      for (let index = LOAD_BURST_SIZE; index < LOAD_OCCURRENCES; index += 1) {
        await pause(scheduleOccurrence(index, started) - Date.now(), runController.signal);
        if (runController.signal.aborted) return;
        await submit(index);
      }
    })();

    const sessions = target.sessions.map(async (cookie, index) => {
      let didMutate = false;
      while (Date.now() < endAt) {
        const auth = { Cookie: cookie };
        const [list, dashboard] = await Promise.all([
          request('backoffice.list', '/api/core/occurrences?page=1&pageSize=50', { headers: auth }),
          request('backoffice.dashboard', '/api/core/dashboard', { headers: auth }),
        ]);
        if (!didMutate) {
          const detail = await request('backoffice.detail', `/api/core/occurrences/${encodeURIComponent(mutationIds[index])}`, { headers: auth });
          const occurrence = await detail.json() as { version?: number };
        if (!detail.ok || !Number.isSafeInteger(occurrence.version)) throw new Error(`SYNTHETIC_MUTATION_TARGET_UNAVAILABLE_${detail.status}`);
          const mutation = await request('backoffice.update', `/api/core/occurrences/${encodeURIComponent(mutationIds[index])}`, {
            method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({ expectedVersion: occurrence.version, command: { kind: 'edit', type: 'Alagamentos/Inundação' } }),
          });
          if (!mutation.ok) throw new Error(`SYNTHETIC_MUTATION_FAILED_${mutation.status}`);
          didMutate = true;
          mutated.add(index);
        }
        await Promise.all([list.body?.cancel(), dashboard.body?.cancel()]);
        await pause(Math.max(0, 60_000 - (Date.now() % 60_000)) + index * 50, runController.signal);
      }
    });

    const workers = [nextOccurrence, ...sessions];
    try { await Promise.all(workers); }
    catch (error) {
      runController.abort();
      await Promise.allSettled(workers);
      throw error;
    }

    const conflictId = process.env.CORE_LOAD_CONFLICT_OCCURRENCE_ID!;
    const conflictHeaders = { Cookie: target.sessions[0] };
    const conflictDetail = await request('backoffice.conflictProbe.read', `/api/core/occurrences/${encodeURIComponent(conflictId)}`, { headers: conflictHeaders });
    const conflictOccurrence = await conflictDetail.json() as { version?: number };
    if (!conflictDetail.ok || !Number.isSafeInteger(conflictOccurrence.version)) throw new Error('SYNTHETIC_CONFLICT_TARGET_UNAVAILABLE');
    const conflictResponses = await Promise.all(['conflict A', 'conflict B'].map(() => request('backoffice.conflictProbe.update', `/api/core/occurrences/${encodeURIComponent(conflictId)}`, {
      method: 'PATCH', headers: { ...conflictHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ expectedVersion: conflictOccurrence.version, command: { kind: 'edit', type: 'Alagamentos/Inundação' } }),
    })));
    expectedVersionConflicts = conflictResponses.filter((response) => response.status === 409).length;
    if (conflictResponses.filter((response) => response.status === 200).length !== 1 || expectedVersionConflicts !== 1) throw new Error('OPTIMISTIC_CONCURRENCY_EXPECTATION_FAILED');

    const csv = await request('backoffice.csv', '/api/core/occurrences/export', { headers: { Cookie: process.env.CORE_LOAD_CSV_SESSION! } });
    const exported = Number(csv.headers.get('X-Exported-Count'));
    const total = Number(csv.headers.get('X-Total-Count'));
    const csvText = await csv.text();
    const csvRows = csvRecordCount(csvText);
    if (!csv.ok || total < LOAD_MINIMUM_HISTORY || exported !== total || csvRows !== exported) throw new Error('CSV_INCOMPLETE_OR_HISTORY_TOO_SMALL');

    const photoIds = (process.env.CORE_LOAD_PHOTO_OCCURRENCE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
    for (const id of photoIds) {
      const photo = await request('backoffice.photo', `/api/core/occurrences/${encodeURIComponent(id)}/photo`, { headers: { Cookie: process.env.CORE_LOAD_CSV_SESSION! } });
      if (!photo.ok) throw new Error('PHOTO_READ_FAILED');
      const signed = await photo.json() as { url?: string };
      if (!signed.url) throw new Error('PHOTO_URL_MISSING');
      const before = Date.now();
      try {
        const download = await fetch(signed.url, { signal: AbortSignal.timeout(20_000) });
        events.push({ kind: 'photo.download', elapsedMs: Date.now() - before, status: download.status });
        await download.body?.cancel();
        if (!download.ok) throw new Error('PHOTO_DOWNLOAD_FAILED');
      } catch (error) {
        events.push({ kind: 'photo.download.error', elapsedMs: Date.now() - before });
        throw new Error(safeErrorCode(error));
      }
    }

    clearInterval(reconciliation);
    await recovering;
    await recoverAlerts();
    const alertsReceived=[...occurrences.keys()].filter(id=>realtimeArrivals.has(id)).length;
    const failures=loadAcceptance(events,occurrences.size,alertsReceived);
    const metrics=sanitizedReport(events, startedAt, new Date().toISOString());
    const report = {
      result:metrics.errors===0&&failures.length===0?'approved':'failed',
      runId:process.env.CORE_LOAD_RUN_ID,
      target:{class:process.env.CORE_LOAD_TARGET_CLASS,hostname:target.baseUrl.hostname},
      source:{revision:gitValue(['rev-parse','HEAD']),workingTreeClean:gitValue(['status','--porcelain'])==='',},
      acceptanceFailures:failures,
      alertsReceived,
      socketAlertsReceived:[...occurrences.keys()].filter(id=>socketArrivals.has(id)).length,
      alertsRecovered:[...occurrences.keys()].filter(id=>recoveredFirst.has(id)).length,
      ...metrics,
      scenario: { applicationMode: process.env.CORE_LOAD_APPLICATION_MODE==='production'?'production':process.env.CORE_LOAD_APPLICATION_MODE==='development'?'development':'unspecified', durationMinutes: 60, occurrenceCreates: occurrences.size, idempotencyReplays, burstSize: LOAD_BURST_SIZE, backofficeSessions: LOAD_BACKOFFICE_SESSIONS, successfulSyntheticUpdates: mutated.size, expectedVersionConflicts, minimumHistory: LOAD_MINIMUM_HISTORY, csvRows, photoReads: photoIds.length, realtimeSubscription: 'SUBSCRIBED' },
    };
    const reportPath = resolve(projectRoot, process.env.CORE_LOAD_REPORT_PATH ?? 'test-results/ticket-20-load.json');
    await mkdir(dirname(reportPath), { recursive: true });
    await appendFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
    console.log(`Carga concluída; relatório sanitizado: ${reportPath}`);
    if (report.result !== 'approved') process.exitCode = 1;
  } catch (error) {
    runController.abort();
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'LOAD_RUN_FAILED';
    const failureMetrics = sanitizedReport(events, startedAt, new Date().toISOString());
    const failureReport = {
      result: 'failed', runId: process.env.CORE_LOAD_RUN_ID,
      target: { class: process.env.CORE_LOAD_TARGET_CLASS, hostname: target.baseUrl.hostname },
      source: { revision: gitValue(['rev-parse', 'HEAD']), workingTreeClean: gitValue(['status', '--porcelain']) === '' },
      acceptanceFailures: [code],
      alertsReceived: [...occurrences.keys()].filter(id => realtimeArrivals.has(id)).length,
      socketAlertsReceived: [...occurrences.keys()].filter(id => socketArrivals.has(id)).length,
      alertsRecovered: [...occurrences.keys()].filter(id => recoveredFirst.has(id)).length,
      ...failureMetrics,
      scenario: { applicationMode: process.env.CORE_LOAD_APPLICATION_MODE === 'production' ? 'production' : 'unspecified', elapsedMinutes: Math.floor((Date.now() - started) / 60_000), occurrenceCreates: occurrences.size, backofficeSessions: LOAD_BACKOFFICE_SESSIONS, realtimeSubscription: subscription },
    };
    const reportPath = resolve(projectRoot, process.env.CORE_LOAD_REPORT_PATH ?? 'test-results/ticket-20-load.json');
    await mkdir(dirname(reportPath), { recursive: true });
    await appendFile(reportPath, `${JSON.stringify(failureReport, null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
    throw error;
  } finally {
    clearInterval(progress);
    clearInterval(reconciliation);
    await recovering;
    await Promise.race([realtime.removeChannel(channel), sleep(5_000)]);
    realtime.realtime.disconnect();
    await Promise.race([realtime.removeAllChannels(), sleep(5_000)]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    const code = error instanceof Error && /^[A-Z0-9_]+$/.test(error.message) ? error.message : 'LOAD_RUN_FAILED';
    console.error(`Ticket 20 load test stopped: ${code}`);
    process.exitCode = 1;
  });
}
