import { assertTestTarget, databaseIdentity, type DatabaseEnvironment } from '../tests/fixtures/database.ts';

export type RestoreSnapshot = {
  tables: Array<{ name: string; rows: number; digest: string }>;
  sequences?: Array<{ name: string; lastValue: string | null }>;
  extensions: string[];
  invalidConstraints: number;
  policyDigest: string;
  schemaDigest?: string;
};

export type RestorePorts<Backup> = {
  mode: 'real' | 'simulation';
  now(): number;
  inspect(target: string): Promise<RestoreSnapshot>;
  backup(source: string): Promise<Backup>;
  restore(target: string, backup: Backup): Promise<void>;
  dispose?(backup: Backup): Promise<void>;
};

export type RestoreReport = {
  mode: 'real' | 'simulation';
  result: 'approved' | 'simulation' | 'failed';
  durationMs: number;
  tablesVerified: number;
  tableEvidence: Array<{ name: string; rows: number; digest: string }>;
  sequenceEvidence: Array<{ name: string; lastValue: string | null }>;
  sourceUnchanged: boolean;
  restoredMatchesSource: boolean;
  postgisPresent: boolean;
  invalidConstraints: number;
  errorCode?: 'BACKUP_FAILED' | 'RESTORE_FAILED' | 'VERIFY_FAILED' | 'CLEANUP_FAILED' | 'DESTINATION_NOT_EMPTY' | 'TOOLS_UNAVAILABLE' | 'SYNTHETIC_SOURCE_NOT_CONFIRMED';
  limitations: string[];
};

export function assertRestoreTargets(source: string | undefined, destination: string | undefined, env: DatabaseEnvironment): { source: string; destination: string } {
  assertTestTarget(source, env);
  assertTestTarget(destination, env);
  if (databaseIdentity(source) === databaseIdentity(destination)) {
    throw new Error('Origem e destino da restauração devem ser bancos descartáveis distintos.');
  }
  return { source, destination };
}

export function assertSyntheticRestoreSource(env: DatabaseEnvironment): void {
  if (env.RESTORE_SOURCE_IS_SYNTHETIC !== 'true') {
    throw new Error('SYNTHETIC_SOURCE_NOT_CONFIRMED');
  }
}

function snapshotKey(snapshot: RestoreSnapshot) {
  return JSON.stringify({
    tables: [...snapshot.tables].sort((a, b) => a.name.localeCompare(b.name)),
    sequences: [...(snapshot.sequences ?? [])].sort((a, b) => a.name.localeCompare(b.name)),
    extensions: [...snapshot.extensions].sort(),
    invalidConstraints: snapshot.invalidConstraints,
    policyDigest: snapshot.policyDigest,
    schemaDigest: snapshot.schemaDigest ?? null,
  });
}

const limitations = [
  'O backup PostgreSQL não comprova a recuperação de identidades do Supabase Auth.',
  'Bytes de objetos do Supabase Storage exigem backup e restauração próprios.',
  'Schemas gerenciados Auth/Storage e publicações Realtime exigem preparação e recuperação próprias.',
  'Roles globais referenciadas pelos grants e políticas devem existir no destino.',
];

export async function runRestoreVerification<Backup>(
  sourceValue: string | undefined,
  destinationValue: string | undefined,
  env: DatabaseEnvironment,
  ports: RestorePorts<Backup>,
): Promise<RestoreReport> {
  if (ports.mode === 'real') assertSyntheticRestoreSource(env);
  const { source, destination } = assertRestoreTargets(sourceValue, destinationValue, env);
  const started = ports.now();
  let backup: Backup | undefined;
  let errorCode: RestoreReport['errorCode'];
  let sourceBefore: RestoreSnapshot | undefined;
  let destinationAfter: RestoreSnapshot | undefined;
  let sourceAfter: RestoreSnapshot | undefined;
  let cleanupFailed = false;

  try {
    sourceBefore = await ports.inspect(source);
    try {
      backup = await ports.backup(source);
    } catch (error) {
      errorCode = error instanceof Error && error.message === 'TOOLS_UNAVAILABLE' ? 'TOOLS_UNAVAILABLE' : 'BACKUP_FAILED';
    }
    if (backup !== undefined) {
      try {
        await ports.restore(destination, backup);
      } catch (error) {
        errorCode = error instanceof Error && error.message === 'DESTINATION_NOT_EMPTY'
          ? 'DESTINATION_NOT_EMPTY'
          : error instanceof Error && error.message === 'TOOLS_UNAVAILABLE'
            ? 'TOOLS_UNAVAILABLE'
            : 'RESTORE_FAILED';
      }
    }
    if (backup !== undefined && !errorCode) {
      try {
        [destinationAfter, sourceAfter] = await Promise.all([
          ports.inspect(destination),
          ports.inspect(source),
        ]);
      } catch {
        errorCode = 'VERIFY_FAILED';
      }
    }
  } catch {
    errorCode = 'VERIFY_FAILED';
  } finally {
    if (backup !== undefined && ports.dispose) {
      try {
        await ports.dispose(backup);
      } catch {
        cleanupFailed = true;
      }
    }
  }

  if (cleanupFailed) errorCode = 'CLEANUP_FAILED';
  const sourceUnchanged = Boolean(sourceBefore && sourceAfter && snapshotKey(sourceBefore) === snapshotKey(sourceAfter));
  const restoredMatchesSource = Boolean(sourceBefore && destinationAfter && snapshotKey(sourceBefore) === snapshotKey(destinationAfter));
  const postgisPresent = Boolean(destinationAfter?.extensions.includes('postgis'));
  const valid = !errorCode && sourceUnchanged && restoredMatchesSource && postgisPresent && destinationAfter?.invalidConstraints === 0;

  return {
    mode: ports.mode,
    result: valid ? (ports.mode === 'real' ? 'approved' : 'simulation') : 'failed',
    durationMs: Math.max(0, ports.now() - started),
    tablesVerified: sourceBefore?.tables.length ?? 0,
    tableEvidence: sourceBefore?.tables.map(({ name, rows, digest }) => ({ name, rows, digest })) ?? [],
    sequenceEvidence: sourceBefore?.sequences ?? [],
    sourceUnchanged,
    restoredMatchesSource,
    postgisPresent,
    invalidConstraints: destinationAfter?.invalidConstraints ?? 0,
    ...(errorCode ? { errorCode } : {}),
    limitations,
  };
}
