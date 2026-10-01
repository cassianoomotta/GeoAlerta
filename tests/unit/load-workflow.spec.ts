import { expect, test } from '@playwright/test';
import { assertLoadTarget, csvRecordCount, LOAD_DURATION_MS, LOAD_OCCURRENCES, percentile, sanitizedReport, scheduleOccurrence } from '../../scripts/load-workflow';

const sessions = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`CORE_LOAD_SESSION_${String(index + 1).padStart(2, '0')}`, `session-${index + 1}`]));
const validEnv = {
  ...sessions,
  CORE_LOAD_CONFIRM_DISPOSABLE_TARGET: 'YES', CORE_LOAD_TARGET_CLASS: 'disposable', CORE_LOAD_RUN_ID: 'ticket20-test',
  CORE_LOAD_BASE_URL: 'https://geoalerta-homolog.example.invalid', CORE_LOAD_ALLOWLIST_HOST: 'geoalerta-homolog.example.invalid',
  CORE_LOAD_CSV_SESSION: 'csv-session', CORE_LOAD_EXPECTED_HISTORY: '50000', CORE_LOAD_REALTIME_TOKEN: 'token',
  CORE_LOAD_PHOTO_OCCURRENCE_IDS: 'photo-id', CORE_LOAD_MUTATION_OCCURRENCE_IDS: Array.from({ length: 10 }, (_, i) => `mutation-${i}`).join(','),
  CORE_LOAD_CONFLICT_OCCURRENCE_ID: 'conflict-id',
  NEXT_PUBLIC_SUPABASE_URL: 'https://supabase-homolog.example.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  CORE_LOAD_LATITUDE: '-29.85', CORE_LOAD_LONGITUDE: '-50.5',
};

test('RNF-004 agenda 10 criações na rajada e 100 em uma hora', () => {
  const start = 1_000_000;
  const times = Array.from({ length: LOAD_OCCURRENCES }, (_, index) => scheduleOccurrence(index, start));
  expect(times.slice(0, 10)).toEqual(Array(10).fill(start));
  expect(times[10]).toBeGreaterThan(start + 60_000);
  expect(times.at(-1)).toBe(start + LOAD_DURATION_MS);
  expect(() => scheduleOccurrence(LOAD_OCCURRENCES, start)).toThrow('INVALID_LOAD_INDEX');
});

test('RNF-004 calcula percentis com amostra pequena e vazia', () => {
  expect(percentile([5, 1, 3], 50)).toBe(3);
  expect(percentile([5, 1, 3], 95)).toBe(5);
  expect(percentile([], 95)).toBeNull();
});

test('RNF-004 conta registros CSV respeitando aspas e quebras dentro de campo', () => {
  expect(csvRecordCount('\uFEFFid,description\r\n1,"linha 1\nlinha 2"\r\n2,"com ""aspas"""')).toBe(2);
  expect(() => csvRecordCount('id,description\n1,"sem fechar')).toThrow('CSV_UNCLOSED_QUOTE');
});

test('RNF-004 bloqueia execução sem ambiente descartável e dez sessões', () => {
  expect(() => assertLoadTarget({})).toThrow('DISPOSABLE_TARGET_CONFIRMATION_REQUIRED');
  const nineSessions: Record<string, string | undefined> = { ...validEnv };
  delete nineSessions.CORE_LOAD_SESSION_10;
  expect(() => assertLoadTarget(nineSessions)).toThrow('TEN_BACKOFFICE_SESSIONS_REQUIRED');
});

test('RNF-004 bloqueia host oficial mesmo com confirmação explícita', () => {
  expect(() => assertLoadTarget({ ...validEnv, CORE_LOAD_BASE_URL: 'https://fwqbwqxgajnrjwccdebh.supabase.co', CORE_LOAD_ALLOWLIST_HOST: 'fwqbwqxgajnrjwccdebh.supabase.co' })).toThrow('SHARED_OR_DEPLOYED_TARGET_REFUSED');
  expect(() => assertLoadTarget({ ...validEnv, NEXT_PUBLIC_SUPABASE_URL: 'https://fwqbwqxgajnrjwccdebh.supabase.co' })).toThrow('SHARED_OR_DEPLOYED_TARGET_REFUSED');
});

test('RNF-004 relatório de carga contém métricas agregadas sem campos pessoais ou URLs', () => {
  const report = sanitizedReport([{ kind: 'create', elapsedMs: 200, status: 201 }, { kind: 'create', elapsedMs: 400, status: 201 }, { kind: 'list', elapsedMs: 900, status: 500 }], 'start', 'end');
  expect(report).toMatchObject({ totalRequests: 3, errors: 1, statusCounts: { '201': 2, '500': 1 }, latencyMs: { create: { count: 2, p50: 200, p95: 400, max: 400 } } });
  expect(JSON.stringify(report)).not.toMatch(/token|cookie|https?:\/\//i);
});
