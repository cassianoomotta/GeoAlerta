import { expect, test } from '@playwright/test';
import { capacityRatePlan, capacityStageStopReason, evaluateCapacityStage } from '../../scripts/capacity-workflow';

test('RNF-004 inclui a referência de 100 mil requisições por hora e sobe até o teto', () => {
  expect(capacityRatePlan(1_667, 10_000)).toEqual([
    250, 375, 563, 845, 1_268, 1_667, 2_501, 3_752, 5_628, 8_442, 10_000,
  ]);
});

test('RNF-004 aprova um estágio que atende taxa, erros e p95 da mistura de leitura', () => {
  const result = evaluateCapacityStage({
    targetRpm: 1_667,
    durationMs: 120_000,
    scheduled: 3_334,
    started: 3_334,
    completed: 3_320,
    errors: 5,
    pending: 14,
    latenciesMs: {
      'backoffice.list': Array(100).fill(1_200),
      'backoffice.dashboard': Array(100).fill(1_500),
      'backoffice.detail': Array(100).fill(300),
    },
  });

  expect(result).toMatchObject({
    offeredRpm: 1_667,
    measuredRpm: 1_660,
    successfulRpm: 1_657.5,
    errorRatePercent: 0.15,
    scheduleFulfillmentPercent: 100,
    accepted: true,
    failures: [],
    latencyP95Ms: {
      'backoffice.list': 1_200,
      'backoffice.dashboard': 1_500,
      'backoffice.detail': 300,
    },
  });
});

test('RNF-004 reprova estágio que cruza erro, latência ou taxa de chegada', () => {
  const result = evaluateCapacityStage({
    targetRpm: 2_500,
    durationMs: 60_000,
    scheduled: 2_500,
    started: 2_300,
    completed: 2_300,
    errors: 50,
    pending: 200,
    latenciesMs: {
      'backoffice.list': Array(100).fill(3_500),
      'backoffice.dashboard': Array(100).fill(1_500),
      'backoffice.detail': Array(100).fill(300),
    },
  });

  expect(result.accepted).toBe(false);
  expect(result.failures).toEqual(expect.arrayContaining([
    'ERROR_RATE_OVER_1_PERCENT',
    'ARRIVAL_RATE_BELOW_95_PERCENT',
    'BACKOFFICE_LIST_P95_OVER_3000_MS',
  ]));
});

test('RNF-004 interrompe o degrau cedo ao cruzar erro ou p95', () => {
  expect(capacityStageStopReason({ completed: 100, errors: 2, latenciesMs: {} })).toBe('ERROR_RATE_OVER_1_PERCENT');
  expect(capacityStageStopReason({ completed: 200, errors: 0, latenciesMs: { 'backoffice.list': Array(20).fill(3_001) } }))
    .toBe('BACKOFFICE_LIST_P95_OVER_3000_MS');
  expect(capacityStageStopReason({ completed: 99, errors: 99, latenciesMs: {} })).toBeNull();
});
