import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Pool } from 'pg';
import { loadLocalEnv } from './with-env.mjs';
import { assertSyntheticRestoreSource, runRestoreVerification, type RestoreSnapshot } from './restore-workflow.ts';

loadLocalEnv();

type BackupArtifact = { directory: string; file: string };

function childEnvironment(connectionString: string): NodeJS.ProcessEnv {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get('sslmode');
  const validSslModes = new Set(['disable', 'allow', 'prefer', 'require', 'verify-ca', 'verify-full']);
  if (sslMode && !validSslModes.has(sslMode)) throw new Error('SSL_MODE_UNSUPPORTED');

  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || '5432',
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    ...(sslMode ? { PGSSLMODE: sslMode } : {}),
  };
}

function connectionStringWithoutPassword(connectionString: string): string {
  const url = new URL(connectionString);
  url.password = '';
  for (const key of [...url.searchParams.keys()]) {
    if (key !== 'sslmode') url.searchParams.delete(key);
  }
  return url.toString();
}

function runTool(command: string, args: string[], env: NodeJS.ProcessEnv, directory?: string): Promise<void> {
  if (process.env.RESTORE_TOOL_MODE === 'docker' && (command === 'pg_dump' || command === 'pg_restore')) {
    if (!directory || !['localhost','127.0.0.1'].includes(env.PGHOST ?? '')) throw new Error('DOCKER_RESTORE_REQUIRES_LOCAL_TARGET');
    const image = process.env.RESTORE_DOCKER_IMAGE;
    if (!image || !/^postgis\/postgis:\d+-\d+\.\d+$/.test(image)) throw new Error('DOCKER_RESTORE_IMAGE_REQUIRED');
    env = { ...env, PGHOST: 'host.docker.internal' };
    args = ['run','--rm','--mount',`type=bind,source=${directory},target=/backup`,
      ...['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE'].filter(key=>env[key]).flatMap(key=>['--env',key]),
      '--entrypoint',command,image,...args.map(arg=>arg.startsWith(directory) ? `/backup/${arg.slice(directory.length+1)}` : arg)];
    command = 'docker';
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true });
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(new Error(error.code === 'ENOENT' ? 'TOOLS_UNAVAILABLE' : 'RESTORE_TOOL_FAILED'));
    });
    child.once('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error('RESTORE_TOOL_FAILED'));
    });
  });
}

async function inspect(target: string): Promise<RestoreSnapshot> {
  const pool = new Pool({ connectionString: target, max: 1, application_name: 'geoalerta-ticket-19-verification' });
  try {
    const schemas = ['public','geoalerta_private'];
    const tableRows: RestoreSnapshot['tables'] = [];
    const relations = await pool.query<{ schemaname: string; tablename: string }>(
      `SELECT schemaname, tablename FROM pg_tables WHERE schemaname = ANY($1::text[]) ORDER BY schemaname, tablename`,
      [schemas],
    );

    for (const relation of relations.rows) {
      const ident = (value: string) => `"${value.replaceAll('"', '""')}"`;
      const name = `${relation.schemaname}.${relation.tablename}`;
      const result = await pool.query<{ rows: string; digest: string }>(
        `SELECT count(*)::text AS rows, md5(coalesce(string_agg(row_json, E'\\n' ORDER BY row_json), '')) AS digest
         FROM (SELECT to_jsonb(t)::text AS row_json FROM ${ident(relation.schemaname)}.${ident(relation.tablename)} AS t) AS records`,
      );
      tableRows.push({ name, rows: Number(result.rows[0]?.rows ?? 0), digest: result.rows[0]?.digest ?? '' });
    }

    const [extensions, constraints, policies, schema, sequences] = await Promise.all([
      pool.query<{ extname: string }>('SELECT extname FROM pg_extension ORDER BY extname'),
      pool.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid
         JOIN pg_namespace n ON n.oid = r.relnamespace WHERE n.nspname = ANY($1::text[]) AND NOT c.convalidated`, [schemas],
      ),
      pool.query<{ digest: string }>(
        `SELECT md5(coalesce(string_agg(jsonb_build_object('schema', schemaname, 'table', tablename,
          'name', policyname, 'permissive', permissive, 'roles', roles, 'command', cmd,
          'using', qual, 'check', with_check)::text, E'\\n' ORDER BY schemaname, tablename, policyname), '')) AS digest
         FROM pg_policies WHERE schemaname = ANY($1::text[])`, [schemas],
      ),
      pool.query<{ definition: string }>(
        `SELECT md5(coalesce(string_agg(definition, E'\\n' ORDER BY definition), '')) AS definition FROM (
          SELECT 'table:' || table_name || ':' || table_type AS definition FROM information_schema.tables WHERE table_schema = ANY($1::text[])
          UNION ALL SELECT 'table-rls:' || n.nspname || ':' || r.relname || ':' || r.relrowsecurity || ':' || r.relforcerowsecurity
            FROM pg_class r JOIN pg_namespace n ON n.oid = r.relnamespace WHERE n.nspname = ANY($1::text[]) AND r.relkind IN ('r', 'p')
          UNION ALL SELECT 'column:' || table_name || ':' || ordinal_position || ':' || column_name || ':' || data_type || ':' || is_nullable
            FROM information_schema.columns WHERE table_schema = ANY($1::text[])
          UNION ALL SELECT 'view:' || schemaname || ':' || viewname || ':' || definition FROM pg_views WHERE schemaname = ANY($1::text[])
          UNION ALL SELECT 'constraint:' || n.nspname || ':' || r.relname || ':' || c.conname || ':' || pg_get_constraintdef(c.oid)
            FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace WHERE n.nspname = ANY($1::text[])
          UNION ALL SELECT 'sequence:' || n.nspname || ':' || c.relname || ':' || s.seqstart || ':' || s.seqincrement || ':' || s.seqmin || ':' || s.seqmax || ':' || s.seqcache || ':' || s.seqcycle
            FROM pg_sequence s JOIN pg_class c ON c.oid = s.seqrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = ANY($1::text[])
          UNION ALL SELECT 'policy:' || schemaname || ':' || tablename || ':' || policyname || ':' || coalesce(qual, '') || ':' || coalesce(with_check, '')
            FROM pg_policies WHERE schemaname = ANY($1::text[])
          UNION ALL SELECT 'index:' || schemaname || ':' || tablename || ':' || indexname || ':' || indexdef
            FROM pg_indexes WHERE schemaname = ANY($1::text[])
          UNION ALL SELECT 'trigger:' || n.nspname || ':' || r.relname || ':' || t.tgname || ':' || pg_get_triggerdef(t.oid)
            FROM pg_trigger t JOIN pg_class r ON r.oid = t.tgrelid JOIN pg_namespace n ON n.oid = r.relnamespace
            WHERE n.nspname = ANY($1::text[]) AND NOT t.tgisinternal
          UNION ALL SELECT 'routine:' || n.nspname || ':' || p.proname || ':' || pg_get_function_identity_arguments(p.oid) || ':' || pg_get_functiondef(p.oid)
            FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = ANY($1::text[]) AND p.prokind IN ('f', 'p')
        ) AS objects`, [schemas],
      ),
      pool.query<{ schemaname: string; sequencename: string; last_value: string | null }>(
        `SELECT schemaname, sequencename, last_value::text AS last_value FROM pg_sequences WHERE schemaname = ANY($1::text[]) ORDER BY schemaname, sequencename`, [schemas],
      ),
    ]);

    return {
      tables: tableRows,
      sequences: sequences.rows.map((row) => ({ name: `${row.schemaname}.${row.sequencename}`, lastValue: row.last_value })),
      extensions: extensions.rows.map((row) => row.extname),
      invalidConstraints: Number(constraints.rows[0]?.count ?? 0),
      policyDigest: policies.rows[0]?.digest ?? '',
      schemaDigest: schema.rows[0]?.definition ?? '',
    };
  } finally {
    await pool.end();
  }
}

function mapFailure(error: unknown): 'BACKUP_FAILED' | 'RESTORE_FAILED' | 'VERIFY_FAILED' | 'CLEANUP_FAILED' | 'DESTINATION_NOT_EMPTY' | 'TOOLS_UNAVAILABLE' | 'SYNTHETIC_SOURCE_NOT_CONFIRMED' {
  if (error instanceof Error && error.message === 'TOOLS_UNAVAILABLE') return 'TOOLS_UNAVAILABLE';
  if (error instanceof Error && error.message === 'DESTINATION_NOT_EMPTY') return 'DESTINATION_NOT_EMPTY';
  if (error instanceof Error && error.message === 'SYNTHETIC_SOURCE_NOT_CONFIRMED') return 'SYNTHETIC_SOURCE_NOT_CONFIRMED';
  return 'RESTORE_FAILED';
}

async function main() {
  const source = process.env.RESTORE_SOURCE_URL;
  const destination = process.env.RESTORE_DATABASE_URL;
  assertSyntheticRestoreSource(process.env);

  const report = await runRestoreVerification(source, destination, process.env, {
    mode: 'real',
    now: () => Date.now(),
    inspect,
    backup: async (target) => {
      const directory = await mkdtemp(join(tmpdir(), 'geoalerta-restore-'));
      const file = join(directory, 'synthetic-core.backup');
      try {
        // Include extension declarations and private helper functions. A schema-
        // only public dump omits dependencies needed by policies and PostGIS.
        await runTool('pg_dump', ['--format=custom', '--no-owner', '--no-publications',
          '--exclude-schema=auth','--exclude-schema=storage','--exclude-schema=core_test_*',
          '--file', file], childEnvironment(target), directory);
        return { directory, file };
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    },
    restore: async (target, backup: BackupArtifact) => {
      const targetSnapshot = await inspect(target);
      if (targetSnapshot.tables.length > 0) throw new Error('DESTINATION_NOT_EMPTY');
      const database = process.env.RESTORE_TOOL_MODE === 'docker'
        ? decodeURIComponent(new URL(target).pathname.slice(1)) : connectionStringWithoutPassword(target);
      await runTool('pg_restore', ['--exit-on-error', '--single-transaction', '--no-owner', `--dbname=${database}`, backup.file], childEnvironment(target), backup.directory);
    },
    dispose: async (backup: BackupArtifact) => rm(backup.directory, { recursive: true, force: true }),
  });

  const reportPath = process.env.RESTORE_REPORT_PATH;
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  if (reportPath) await writeFile(reportPath, reportJson, { encoding: 'utf8', flag: 'wx' });
  process.stdout.write(reportJson);
  if (report.result !== 'approved') process.exitCode = 1;
}

main().catch(async (error: unknown) => {
  const code = mapFailure(error);
  const report = { mode: 'real', result: 'failed', errorCode: code, limitations: ['O relatório não inclui URLs, credenciais, dados de linhas nem mensagens de ferramentas.'] };
  if (process.env.RESTORE_REPORT_PATH) {
    try { await writeFile(process.env.RESTORE_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' }); } catch { /* Keep the failure output sanitized. */ }
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exitCode = 1;
});
