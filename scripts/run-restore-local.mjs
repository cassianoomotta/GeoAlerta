import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { loadLocalEnv, projectRoot } from './with-env.mjs';

loadLocalEnv(projectRoot);
const { Client } = pg;
function envFromContainer(name) {
  const result = spawnSync('docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', name], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('LOCAL_RESTORE_CONTAINER_UNAVAILABLE');
  return Object.fromEntries(result.stdout.trim().split(/\r?\n/).map(line => {
    const at = line.indexOf('=');
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}
function url(host, port, database, password) {
  return `postgresql://postgres:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const sourceEnv = envFromContainer('supabase_db_supabase-load');
const targetEnv = envFromContainer('geoalerta-test');
const sourceUrl = url('127.0.0.1', '54322', 'postgres', sourceEnv.POSTGRES_PASSWORD);
const targetName = `geoalerta_restore_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const targetUrl = url('127.0.0.1', '5433', targetName, targetEnv.POSTGRES_PASSWORD);
const targetAdmin = new Client({ connectionString: url('127.0.0.1', '5433', 'postgres', targetEnv.POSTGRES_PASSWORD) });
let created = false;
let targetAdminConnected = false;
let createdServiceRole = false;
try {
  const reportPath = 'docs/releases/core/testing/results/2026-10-12-restore-local.json';
  if (existsSync(`${projectRoot}/${reportPath}`)) throw new Error('LOCAL_RESTORE_REPORT_ALREADY_EXISTS');
  const source = new Client({ connectionString: sourceUrl });
  await source.connect();
  try {
    const counts = (await source.query("SELECT count(*)::int AS total,count(*) FILTER (WHERE description ILIKE '%synthetic%')::int AS synthetic FROM public.occurrences WHERE deleted_at IS NULL")).rows[0];
    if (counts.total < 50_000 || counts.synthetic !== counts.total) throw new Error('LOCAL_RESTORE_SOURCE_NOT_SYNTHETIC_OR_TOO_SMALL');
  } finally { await source.end(); }

  await targetAdmin.connect();
  targetAdminConnected = true;
  const serviceRole = await targetAdmin.query("SELECT 1 FROM pg_roles WHERE rolname='service_role'");
  if (serviceRole.rowCount === 0) {
    await targetAdmin.query('CREATE ROLE service_role NOLOGIN');
    createdServiceRole = true;
  }
  const preflight = await targetAdmin.query("SELECT count(*)::int AS roles FROM pg_roles WHERE rolname=ANY($1::text[])", [['anon','authenticated','service_role','geoalerta_runtime','geoalerta_ingest']]);
  const postgis = await targetAdmin.query("SELECT EXISTS(SELECT FROM pg_available_extensions WHERE name='postgis') AS available");
  if (preflight.rows[0].roles !== 5 || !postgis.rows[0].available) throw new Error('LOCAL_RESTORE_TARGET_PLATFORM_NOT_READY');
  await targetAdmin.query(`CREATE DATABASE "${targetName}"`);
  created = true;
  const target = new Client({ connectionString: targetUrl });
  await target.connect();
  try { await target.query(readFileSync(`${projectRoot}/tests/fixtures/platform.sql`, 'utf8')); }
  finally { await target.end(); }

  const env = {
    ...process.env,
    RESTORE_SOURCE_URL: sourceUrl,
    RESTORE_DATABASE_URL: targetUrl,
    RESTORE_SOURCE_IS_SYNTHETIC: 'true',
    RESTORE_TOOL_MODE: 'docker',
    RESTORE_DOCKER_IMAGE: 'postgis/postgis:16-3.4',
    RESTORE_REPORT_PATH: reportPath,
    TEST_DATABASE_ALLOWLIST: JSON.stringify([sourceUrl, targetUrl]),
  };
  const runner = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/test-restore.ts'], { cwd: projectRoot, env, stdio: 'inherit', windowsHide: true, timeout: 2_700_000 });
  if (runner.error?.code === 'ETIMEDOUT') throw new Error('LOCAL_RESTORE_RUN_TIMEOUT');
  if (runner.status !== 0) throw new Error('LOCAL_RESTORE_RUN_FAILED');
} finally {
  if (created) {
    if (!targetAdminConnected) {
      await targetAdmin.connect();
      targetAdminConnected = true;
    }
    await targetAdmin.query(`DROP DATABASE IF EXISTS "${targetName}" WITH (FORCE)`).catch(() => {});
  }
  if (createdServiceRole) await targetAdmin.query('DROP ROLE IF EXISTS service_role').catch(() => {});
  if (targetAdminConnected) await targetAdmin.end();
}
