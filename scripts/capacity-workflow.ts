export type CapacityStageInput = {
  targetRpm: number;
  durationMs: number;
  scheduled: number;
  started: number;
  completed: number;
  errors: number;
  pending: number;
  latenciesMs: Record<string, readonly number[]>;
};

export type CapacityStageResult = {
  targetRpm: number;
  offeredRpm: number;
  measuredRpm: number;
  successfulRpm: number;
  errorRatePercent: number;
  scheduleFulfillmentPercent: number;
  accepted: boolean;
  failures: string[];
  latencyP95Ms: Record<string, number | null>;
};

export const CAPACITY_READ_KINDS = ['backoffice.list', 'backoffice.dashboard', 'backoffice.detail'] as const;
export const CAPACITY_ERROR_LIMIT_PERCENT = 1;
export const CAPACITY_SCHEDULE_FULFILLMENT_MIN_PERCENT = 95;
export const CAPACITY_READ_P95_LIMIT_MS = 3_000;

export function capacityRatePlan(referenceRpm: number, ceilingRpm: number): number[] {
  if (!Number.isSafeInteger(referenceRpm) || referenceRpm < 1 || !Number.isSafeInteger(ceilingRpm) || ceilingRpm < referenceRpm) {
    throw new Error('INVALID_CAPACITY_RATE_PLAN');
  }

  const rates: number[] = [];
  let rate = 250;
  while (rate < referenceRpm) {
    rates.push(rate);
    rate = Math.round(rate * 1.5);
  }
  rates.push(referenceRpm);

  while (rates.at(-1)! < ceilingRpm) {
    const next = Math.round(rates.at(-1)! * 1.5);
    rates.push(Math.min(ceilingRpm, Math.max(rates.at(-1)! + 1, next)));
  }
  return [...new Set(rates)];
}

function percentile(values: readonly number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.max(0, Math.ceil(percentileValue * sorted.length) - 1)];
}

export function capacityStageStopReason(input: { completed: number; errors: number; latenciesMs: Record<string, readonly number[]> }): string | null {
  if (input.completed >= 100 && (input.errors / input.completed) * 100 > CAPACITY_ERROR_LIMIT_PERCENT) return 'ERROR_RATE_OVER_1_PERCENT';
  for (const kind of CAPACITY_READ_KINDS) {
    const values = input.latenciesMs[kind] ?? [];
    const p95 = values.length >= 20 ? percentile(values, 0.95) : null;
    if (p95 !== null && p95 > CAPACITY_READ_P95_LIMIT_MS) return `${kind.replaceAll('.', '_').toUpperCase()}_P95_OVER_3000_MS`;
  }
  return null;
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

export function evaluateCapacityStage(input: CapacityStageInput): CapacityStageResult {
  if (input.durationMs <= 0 || input.scheduled < 0 || input.started < 0 || input.completed < 0 || input.errors < 0 || input.errors > input.completed || input.pending < 0) {
    throw new Error('INVALID_CAPACITY_STAGE_METRICS');
  }
  const minutes = input.durationMs / 60_000;
  const offeredRpm = input.started / minutes;
  const measuredRpm = input.completed / minutes;
  const successfulRpm = (input.completed - input.errors) / minutes;
  const errorRatePercent = input.completed ? (input.errors / input.completed) * 100 : 100;
  const scheduleFulfillmentPercent = input.scheduled ? (input.started / input.scheduled) * 100 : 0;
  const latencyP95Ms = Object.fromEntries(CAPACITY_READ_KINDS.map((kind) => [kind, percentile(input.latenciesMs[kind] ?? [], 0.95)]));
  const failures: string[] = [];

  if (errorRatePercent > CAPACITY_ERROR_LIMIT_PERCENT) failures.push('ERROR_RATE_OVER_1_PERCENT');
  if (scheduleFulfillmentPercent < CAPACITY_SCHEDULE_FULFILLMENT_MIN_PERCENT) failures.push('ARRIVAL_RATE_BELOW_95_PERCENT');
  if (input.pending / Math.max(1, input.scheduled) > 0.01) failures.push('PENDING_REQUESTS_OVER_1_PERCENT');
  for (const kind of CAPACITY_READ_KINDS) {
    const p95 = latencyP95Ms[kind];
    const safeName = kind.replaceAll('.', '_').toUpperCase();
    if (p95 === null) failures.push(`${safeName}_NO_SAMPLES`);
    else if (p95 > CAPACITY_READ_P95_LIMIT_MS) failures.push(`${safeName}_P95_OVER_3000_MS`);
  }

  return {
    targetRpm: input.targetRpm,
    offeredRpm: rounded(offeredRpm),
    measuredRpm: rounded(measuredRpm),
    successfulRpm: rounded(successfulRpm),
    errorRatePercent: rounded(errorRatePercent),
    scheduleFulfillmentPercent: rounded(scheduleFulfillmentPercent),
    accepted: failures.length === 0,
    failures,
    latencyP95Ms,
  };
}
