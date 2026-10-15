import { execFileSync } from 'node:child_process';
import { cpus, platform, release, totalmem } from 'node:os';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadLocalEnv, projectRoot } from './with-env.mjs';
import { assertLoadTarget, type LoadEvent } from './load-workflow.ts';
import { capacityRatePlan, capacityStageStopReason, evaluateCapacityStage, type CapacityStageResult } from './capacity-workflow.ts';

const REFERENCE_RPM = 1_667; // 100,000 requests per hour, rounded up.
const CEILING_RPM = 20_000; // Local hard cap: 333 scheduled requests/second.
const RAMP_STAGE_MS = 120_000;
const SEARCH_STAGE_MS = 90_000;
const SOAK_STAGE_MS = 300_000;
const MAX_IN_FLIGHT = 500;
const REQUEST_TIMEOUT_MS = 15_000;
const ROUTE_IDS = ['backoffice.list', 'backoffice.dashboard', 'backoffice.detail'] as const;
const sleep = (ms: number) => new Promise((resolveSleep) => setTimeout(resolveSleep, Math.max(0, ms)));

type StageKind = 'ramp' | 'search' | 'soak' | 'fallback';
type CapacityEvent = LoadEvent & { bytes?: number };
type StageRecord = CapacityStageResult & {
  kind: StageKind;
  startedAt: string;
  finishedAt: string;
  durationSeconds: number;
  plannedDurationSeconds: number;
  scheduledRequests: number;
  startedRequests: number;
  completedResponses: number;
  unexpectedErrors: number;
  pendingAtDrain: number;
  schedulerSkippedSlots: number;
  earlyStopReason: string | null;
  maxInFlight: number;
  statusCounts: Record<string, number>;
  latencySummaryMs: Record<string, { count: number; p50: number | null; p95: number | null; max: number | null }>;
  resourcesAtEnd: Record<string, unknown>;
  driver: { cpuPercentOfOneCore: number; eventLoopUtilizationPercent: number; rssBytes: number };
};

function percentile(values: readonly number[], percent: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(percent * sorted.length) - 1)];
}

function latencySummary(events: readonly CapacityEvent[]) {
  return Object.fromEntries(ROUTE_IDS.map((kind) => {
    const values = events.filter((event) => event.kind === kind).map((event) => event.elapsedMs);
    return [kind, { count: values.length, p50: percentile(values, 0.5), p95: percentile(values, 0.95), max: values.length ? Math.max(...values) : null }];
  }));
}

function dockerDbStats(): Record<string, unknown> {
  try {
    const raw = execFileSync('docker', ['stats', '--no-stream', '--format', '{{.Name}};{{.CPUPerc}};{{.MemUsage}}', 'supabase_db_supabase-load'], { encoding: 'utf8', timeout: 10_000, windowsHide: true }).trim();
    const [container, cpu, memory] = raw.split(';');
    return { container, cpuPercent: cpu, memory };
  } catch {
    return { unavailable: 'DOCKER_STATS_UNAVAILABLE' };
  }
}

function appProcessStats(): Record<string, unknown> {
  const pid = Number(process.env.CORE_LOAD_APP_PID);
  if (platform() !== 'win32' || !Number.isSafeInteger(pid) || pid < 1) return { unavailable: 'APP_PROCESS_METRICS_UNAVAILABLE' };
  try {
    const output = execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `Get-Process -Id ${pid} -ErrorAction Stop | Select-Object @{n='cpuSeconds';e={$_.CPU}},@{n='workingSetBytes';e={$_.WorkingSet64}} | ConvertTo-Json -Compress`], { encoding: 'utf8', timeout: 10_000, windowsHide: true });
    return JSON.parse(output);
  } catch {
    return { unavailable: 'APP_PROCESS_METRICS_UNAVAILABLE' };
  }
}

function sourceValue(args: string[]): string | null {
  try { return execFileSync('git', args, { cwd: projectRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return null; }
}

async function main() {
  loadLocalEnv();
  const target = assertLoadTarget(process.env);
  const mutationIds = (process.env.CORE_LOAD_MUTATION_OCCURRENCE_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
  if (mutationIds.length < 1) throw new Error('SYNTHETIC_DETAIL_TARGET_REQUIRED');
  if (target.baseUrl.hostname !== '127.0.0.1' || target.baseUrl.port !== '3100') throw new Error('CAPACITY_TARGET_MUST_BE_LOCAL_NEXT_PROCESS');

  const runId = process.env.CORE_LOAD_RUN_ID!;
  const reportPath = resolve(projectRoot, process.env.CORE_LOAD_REPORT_PATH ?? 'docs/releases/core/testing/results/2026-10-12-capacity-load.json');
  const startedAt = new Date().toISOString();
  const stages: StageRecord[] = [];
  let highestPassingRpm = 0;
  let firstFailingRpm: number | null = null;
  let observedCeiling = false;
  const sessionHeaders = target.sessions.map((cookie) => ({ Cookie: cookie }));

  const machine = {
    os: `${platform()} ${release()}`,
    architecture: process.arch,
    logicalCpus: cpus().length,
    cpuModel: cpus()[0]?.model ?? 'unknown',
    totalMemoryBytes: totalmem(),
    node: process.version,
  };

  const report = (result: string) => ({
    schemaVersion: 1,
    result,
    runId,
    target: { class: 'disposable', hostname: target.baseUrl.hostname, appPort: Number(target.baseUrl.port) },
    source: { revision: sourceValue(['rev-parse', 'HEAD']), workingTreeClean: sourceValue(['status', '--porcelain']) === '' },
    startedAt,
    updatedAt: new Date().toISOString(),
    machine,
    profile: {
      type: 'authenticated_backoffice_read_mix',
      mixPercent: { 'backoffice.list': 60, 'backoffice.dashboard': 30, 'backoffice.detail': 10 },
      sessions: sessionHeaders.length,
      schedule: 'constant-arrival-rate staircase; 2m per ramp stage, 90s per boundary search stage, then 5m confirmation soak',
      referenceRpm: REFERENCE_RPM,
      referenceRequestsPerHour: 100_000,
      hardCeilingRpm: CEILING_RPM,
      maxInFlight: MAX_IN_FLIGHT,
      passCriteria: { maxUnexpectedErrorPercent: 1, minScheduledArrivalPercent: 95, maxReadP95Ms: 3_000, maxPendingPercent: 1 },
      excluded: ['public occurrence writes', 'photo uploads/downloads', 'hosted Vercel/Kong/CDN', 'distributed client hosts'],
    },
    capacity: {
      highestPassingRpm,
      highestPassingRequestsPerHour: highestPassingRpm * 60,
      totalScheduledRequests: stages.reduce((sum, stage) => sum + stage.scheduledRequests, 0),
      totalStartedRequests: stages.reduce((sum, stage) => sum + stage.startedRequests, 0),
      totalCompletedResponses: stages.reduce((sum, stage) => sum + stage.completedResponses, 0),
      totalUnexpectedErrors: stages.reduce((sum, stage) => sum + stage.unexpectedErrors, 0),
      peakObservedSuccessfulRpm: Math.max(0, ...stages.map((stage) => stage.successfulRpm)),
      referenceReached: highestPassingRpm >= REFERENCE_RPM,
      firstFailingRpm,
      ceilingReached: observedCeiling,
      validatedSustainableRpm: stages.findLast((stage) => stage.kind === 'soak' && stage.accepted)?.targetRpm ?? null,
      stagesCompleted: stages.length,
    },
    stages,
  });

  const saveReport = async (result: string) => {
    await mkdir(dirname(reportPath), { recursive: true });
    await writeFile(reportPath, `${JSON.stringify(report(result), null, 2)}\n`, { encoding: 'utf8', flag: 'w' });
  };

  const runStage = async (targetRpm: number, durationMs: number, kind: StageKind): Promise<StageRecord> => {
    const stageStart = Date.now();
    const startedIso = new Date(stageStart).toISOString();
    const scheduledRequests = Math.floor(targetRpm * durationMs / 60_000);
    const stageEvents: CapacityEvent[] = [];
    const active = new Set<Promise<void>>();
    const controller = new AbortController();
    const interval = 60_000 / targetRpm;
    let startedRequests = 0;
    let schedulerSkippedSlots = 0;
    let currentInFlight = 0;
    let maximumInFlight = 0;
    const driverStart = process.resourceUsage();
    const eventLoopStart = performance.eventLoopUtilization();
    let requestIndex = 0;
    let nextAt = stageStart;
    let earlyStopReason: string | null = null;

    const makeRequest = async (index: number) => {
      const bucket = index % 20;
      const kindIndex = bucket < 12 ? 0 : bucket < 18 ? 1 : 2;
      const routeKind = ROUTE_IDS[kindIndex];
      const cookieIndex = index % sessionHeaders.length;
      const detailId = mutationIds[index % mutationIds.length];
      const paths = ['/api/core/occurrences?page=1&pageSize=50', '/api/core/dashboard', `/api/core/occurrences/${encodeURIComponent(detailId)}`];
      const before = performance.now();
      try {
        const response = await fetch(new URL(paths[kindIndex], target.baseUrl), {
          method: 'GET',
          headers: sessionHeaders[cookieIndex],
          cache: 'no-store',
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]),
        });
        const body = await response.arrayBuffer();
        const elapsedMs = Math.max(0, performance.now() - before);
        const event = { kind: routeKind, elapsedMs, status: response.status, bytes: body.byteLength };
        stageEvents.push(event);
      } catch {
        const event = { kind: routeKind, elapsedMs: Math.max(0, performance.now() - before), status: 0 };
        stageEvents.push(event);
      } finally {
        currentInFlight -= 1;
        if (!earlyStopReason) {
          earlyStopReason = capacityStageStopReason({
            completed: stageEvents.length,
            errors: stageEvents.filter((event) => event.status !== 200).length,
            latenciesMs: Object.fromEntries(ROUTE_IDS.map((route) => [route, stageEvents.filter((event) => event.kind === route).map((event) => event.elapsedMs)])),
          });
        }
      }
    };

    while (Date.now() < stageStart + durationMs && !earlyStopReason) {
      const remaining = nextAt - Date.now();
      if (remaining > 0) await sleep(remaining);
      const now = Date.now();
      if (now >= stageStart + durationMs) break;
      if (now - nextAt > interval) {
        const skipped = Math.floor((now - nextAt) / interval);
        schedulerSkippedSlots += skipped;
        nextAt += skipped * interval;
      }
      if (currentInFlight < MAX_IN_FLIGHT) {
        const index = requestIndex++;
        startedRequests += 1;
        currentInFlight += 1;
        maximumInFlight = Math.max(maximumInFlight, currentInFlight);
        const task = makeRequest(index);
        active.add(task);
        void task.finally(() => active.delete(task));
      } else {
        schedulerSkippedSlots += 1;
      }
      nextAt += interval;
    }

    await Promise.race([Promise.allSettled([...active]), sleep(earlyStopReason ? 5_000 : REQUEST_TIMEOUT_MS)]);
    const pendingAtDrain = active.size;
    if (pendingAtDrain) controller.abort();
    await Promise.allSettled([...active]);
    controller.abort();

    const statusCounts: Record<string, number> = {};
    for (const event of stageEvents) statusCounts[String(event.status ?? 0)] = (statusCounts[String(event.status ?? 0)] ?? 0) + 1;
    const errors = stageEvents.filter((event) => event.status !== 200).length;
    const activeDurationMs = Math.max(1, Math.min(durationMs, Date.now() - stageStart));
    const scheduledAtStop = Math.floor(targetRpm * activeDurationMs / 60_000);
    const evaluated = evaluateCapacityStage({
      targetRpm,
      durationMs: activeDurationMs,
      scheduled: scheduledAtStop,
      started: startedRequests,
      completed: stageEvents.length,
      errors,
      pending: pendingAtDrain,
      latenciesMs: Object.fromEntries(ROUTE_IDS.map((route) => [route, stageEvents.filter((event) => event.kind === route).map((event) => event.elapsedMs)])),
    });
    if (earlyStopReason && !evaluated.failures.includes(earlyStopReason)) evaluated.failures.push(earlyStopReason);
    evaluated.accepted = evaluated.failures.length === 0;
    const usageEnd = process.resourceUsage();
    const driverCpuMicros = (usageEnd.userCPUTime + usageEnd.systemCPUTime) - (driverStart.userCPUTime + driverStart.systemCPUTime);
    const loop = performance.eventLoopUtilization(eventLoopStart);
    const summary = latencySummary(stageEvents);
    const record: StageRecord = {
      ...evaluated,
      kind,
      startedAt: startedIso,
      finishedAt: new Date().toISOString(),
      durationSeconds: activeDurationMs / 1000,
      plannedDurationSeconds: durationMs / 1000,
      scheduledRequests,
      startedRequests,
      completedResponses: stageEvents.length,
      unexpectedErrors: errors,
      pendingAtDrain,
      schedulerSkippedSlots,
      earlyStopReason,
      maxInFlight: maximumInFlight,
      statusCounts,
      latencySummaryMs: summary,
      resourcesAtEnd: { database: dockerDbStats(), app: appProcessStats() },
      driver: {
        cpuPercentOfOneCore: Math.round((driverCpuMicros / (durationMs * 1000)) * 10_000) / 100,
        eventLoopUtilizationPercent: Math.round(loop.utilization * 10_000) / 100,
        rssBytes: process.memoryUsage().rss,
      },
    };
    return record;
  };

  const runAndRecord = async (rate: number, duration: number, kind: StageKind) => {
    const stage = await runStage(rate, duration, kind);
    stages.push(stage);
    if (stage.accepted) highestPassingRpm = Math.max(highestPassingRpm, rate);
    else if (firstFailingRpm === null) firstFailingRpm = rate;
    await saveReport('running');
    console.log(JSON.stringify({ kind, targetRpm: rate, measuredRpm: stage.measuredRpm, successfulRpm: stage.successfulRpm, accepted: stage.accepted, p95Ms: stage.latencySummaryMs, failures: stage.failures }));
    return stage;
  };

  try {
    const initialPlan = capacityRatePlan(REFERENCE_RPM, CEILING_RPM);
    for (const rpm of initialPlan) {
      const stage = await runAndRecord(rpm, RAMP_STAGE_MS, 'ramp');
      if (!stage.accepted) { firstFailingRpm = rpm; break; }
    }
    if (firstFailingRpm !== null && highestPassingRpm === 0) {
      const fallback = await runAndRecord(100, RAMP_STAGE_MS, 'fallback');
      if (!fallback.accepted) firstFailingRpm = Math.min(firstFailingRpm, 100);
    }

    if (firstFailingRpm !== null && highestPassingRpm > 0) {
      let low = highestPassingRpm;
      let high = firstFailingRpm;
      for (let attempt = 0; attempt < 6 && high - low > Math.max(50, low * 0.05); attempt += 1) {
        const midpoint = Math.round(((low + high) / 2) / 25) * 25;
        if (midpoint <= low || midpoint >= high) break;
        const stage = await runAndRecord(midpoint, SEARCH_STAGE_MS, 'search');
        if (stage.accepted) low = midpoint;
        else high = midpoint;
      }
      highestPassingRpm = low;
      firstFailingRpm = high;
    } else if (highestPassingRpm === CEILING_RPM) {
      observedCeiling = true;
    }

    if (highestPassingRpm > 0) {
      let soak = await runAndRecord(highestPassingRpm, SOAK_STAGE_MS, 'soak');
      if (!soak.accepted) {
        observedCeiling = false;
        const prior = stages.filter((stage) => stage.accepted && stage.kind !== 'soak' && stage.targetRpm < highestPassingRpm).at(-1);
        if (prior) {
          highestPassingRpm = prior.targetRpm;
          soak = await runAndRecord(highestPassingRpm, SOAK_STAGE_MS, 'soak');
        }
      }
      if (!soak.accepted) highestPassingRpm = 0;
    }

    const result = highestPassingRpm === 0 ? 'no_sustainable_stage_found' : observedCeiling ? 'ceiling_reached_lower_bound' : 'capacity_boundary_measured';
    await saveReport(result);
    if (highestPassingRpm === 0) process.exitCode = 2;
    console.log(`Capacidade medida; relatório sanitizado: ${reportPath}`);
  } catch (error) {
    await saveReport('runner_failed');
    const errorName = error instanceof Error ? error.name : 'UNKNOWN';
    console.error(`Capacity run stopped: ${/^[A-Za-z0-9_]+$/.test(errorName) ? errorName : 'RUNNER_ERROR'}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(() => {
    console.error('Capacity run stopped: RUNNER_ERROR');
    process.exitCode = 1;
  });
}
