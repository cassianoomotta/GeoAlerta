import { expect, test } from '@playwright/test';
import { assertRestoreTargets, assertSyntheticRestoreSource, runRestoreVerification, type RestorePorts, type RestoreSnapshot } from '../../scripts/restore-workflow';

const source = 'postgresql://source:secret@127.0.0.1:5432/core_test';
const destination = 'postgresql://target:secret@127.0.0.1:5433/core_restore';
const env = {
  TEST_DATABASE_ALLOWLIST: JSON.stringify([source, destination]),
  DATABASE_URL: 'postgresql://app:secret@127.0.0.1:5432/operational',
};
const snapshot: RestoreSnapshot = {
  tables: [
    { name: 'occurrences', rows: 3, digest: 'occurrences-hash' },
    { name: 'resources', rows: 2, digest: 'resources-hash' },
  ],
  sequences: [{ name: 'public.occurrences_id_seq', lastValue: '3' }],
  extensions: ['postgis'],
  invalidConstraints: 0,
  policyDigest: 'policies-hash',
  schemaDigest: 'schema-hash',
};

function ports(overrides: Partial<RestorePorts<string>> = {}): RestorePorts<string> {
  let now = 100;
  return {
    mode: 'simulation',
    now: () => { now += 5; return now; },
    inspect: async () => structuredClone(snapshot),
    backup: async () => 'synthetic-backup',
    restore: async () => undefined,
    dispose: async () => undefined,
    ...overrides,
  };
}

test('RNF-007 restauração exige origem e destino allowlisted, distintos e não operacionais', () => {
  expect(assertRestoreTargets(source, destination, env)).toEqual({ source, destination });
  expect(() => assertRestoreTargets(source, source, env)).toThrow('distintos');
  expect(() => assertRestoreTargets(source, undefined, env)).toThrow('ausente');
  expect(() => assertRestoreTargets(source, 'postgresql://bad:secret@127.0.0.1:5434/not_allowed', env)).toThrow('fora');
  expect(() => assertRestoreTargets(source, env.DATABASE_URL, { ...env, TEST_DATABASE_ALLOWLIST: JSON.stringify([source, env.DATABASE_URL]) })).toThrow('execução/produção');
});

test('RNF-007 exige confirmação explícita de que a origem contém apenas dados sintéticos', () => {
  expect(() => assertSyntheticRestoreSource(env)).toThrow('SYNTHETIC_SOURCE_NOT_CONFIRMED');
  expect(() => assertSyntheticRestoreSource({ ...env, RESTORE_SOURCE_IS_SYNTHETIC: 'true' })).not.toThrow();
});

test('RNF-007 modo real exige origem sintética confirmada antes de inspecionar bancos', async () => {
  let inspected = false;
  await expect(runRestoreVerification(source, destination, env, ports({
    mode: 'real',
    inspect: async () => { inspected = true; return structuredClone(snapshot); },
  }))).rejects.toThrow('SYNTHETIC_SOURCE_NOT_CONFIRMED');
  expect(inspected).toBe(false);
});

test('RNF-007 orquestra backup e restauração, compara integridade e nunca aprova doubles', async () => {
  const calls: string[] = [];
  const report = await runRestoreVerification(source, destination, env, ports({
    inspect: async (target) => { calls.push(`inspect:${target === source ? 'source' : 'destination'}`); return structuredClone(snapshot); },
    backup: async (target) => { calls.push(`backup:${target === source ? 'source' : 'other'}`); return 'synthetic-backup'; },
    restore: async (target, backup) => { calls.push(`restore:${target === destination && backup === 'synthetic-backup' ? 'destination' : 'wrong'}`); },
  }));

  expect(calls).toEqual(['inspect:source', 'backup:source', 'restore:destination', 'inspect:destination', 'inspect:source']);
  expect(report).toMatchObject({ mode: 'simulation', result: 'simulation', tablesVerified: 2, sequenceEvidence: [{ name: 'public.occurrences_id_seq', lastValue: '3' }], sourceUnchanged: true, restoredMatchesSource: true, postgisPresent: true, invalidConstraints: 0 });
  expect(JSON.stringify(report)).not.toContain('secret');
  expect(report.limitations).toHaveLength(4);
});

test('RNF-007 falha de backup produz relatório sanitizado sem expor credenciais', async () => {
  let disposed = false;
  const report = await runRestoreVerification(source, destination, env, ports({
    backup: async () => { throw new Error(`credential leaked: ${source}`); },
    dispose: async () => { disposed = true; },
  }));
  expect(disposed).toBe(false);
  expect(report).toMatchObject({ result: 'failed', errorCode: 'BACKUP_FAILED', sourceUnchanged: false, restoredMatchesSource: false });
  expect(JSON.stringify(report)).not.toContain(source);
});

test('RNF-007 descarta backup mesmo quando a restauração falha e não expõe erro de conexão', async () => {
  let disposed = false;
  const report = await runRestoreVerification(source, destination, env, ports({
    restore: async () => { throw new Error(`credential leaked: ${destination}`); },
    dispose: async () => { disposed = true; },
  }));
  expect(disposed).toBe(true);
  expect(report).toMatchObject({ result: 'failed', errorCode: 'RESTORE_FAILED' });
  expect(JSON.stringify(report)).not.toContain(destination);
});

test('RNF-007 rejeita alvo de restauração não vazio sem limpá-lo', async () => {
  const report = await runRestoreVerification(source, destination, env, ports({
    restore: async () => { throw new Error('DESTINATION_NOT_EMPTY'); },
  }));
  expect(report).toMatchObject({ result: 'failed', errorCode: 'DESTINATION_NOT_EMPTY', sourceUnchanged: false });
});

test('RNF-007 falha se a origem mudar durante a restauração', async () => {
  let sourceInspections = 0;
  const report = await runRestoreVerification(source, destination, env, ports({
    inspect: async (target) => {
      if (target !== source) return structuredClone(snapshot);
      sourceInspections += 1;
      return { ...structuredClone(snapshot), ...(sourceInspections > 1 ? { schemaDigest: 'changed-schema' } : {}) };
    },
  }));
  expect(report).toMatchObject({ result: 'failed', sourceUnchanged: false, restoredMatchesSource: true });
});
