import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { createConnection } from 'node:net';
import pg from 'pg';
import { createServerClient } from '@supabase/ssr';
import { loadLocalEnv, projectRoot } from './with-env.mjs';

loadLocalEnv(projectRoot);
const { Client } = pg;
const runMode = process.argv[2] ?? 'endurance';
if (!['endurance', 'capacity'].includes(runMode)) throw new Error('LOCAL_LOAD_MODE_UNSUPPORTED');
const capacityMode = runMode === 'capacity';
const container = 'supabase_db_supabase-load';
const envFromContainer = name => {
  const inspected = spawnSync('docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', name], { encoding: 'utf8', windowsHide: true });
  if (inspected.status !== 0) throw new Error('LOCAL_LOAD_CONTAINER_UNAVAILABLE');
  return Object.fromEntries(inspected.stdout.trim().split(/\r?\n/).map(line => {
  const at = line.indexOf('=');
  return at < 0 ? [line, ''] : [line.slice(0, at), line.slice(at + 1)];
  }));
};
const databaseStack = envFromContainer(container);
const authStack = envFromContainer('supabase_auth_supabase-load');
const jwtSecret = authStack.GOTRUE_JWT_SECRET;
const dbPassword = databaseStack.POSTGRES_PASSWORD;
if (!jwtSecret || !dbPassword) throw new Error('LOCAL_LOAD_STACK_CREDENTIALS_UNAVAILABLE');

const baseUrl = 'http://127.0.0.1:54321';
const authUrl = `${baseUrl}/auth/v1`;
const now = Math.floor(Date.now() / 1000);
const signJwt = role => {
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ iss: 'supabase', role, iat: now, exp: now + 10_800 })).toString('base64url')}`;
  return `${unsigned}.${createHmac('sha256', jwtSecret).update(unsigned).digest('base64url')}`;
};
const anonKey = signJwt('anon');
const serviceKey = signJwt('service_role');
const requestJson = async (url, options = {}) => {
  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`LOCAL_LOAD_AUTH_HTTP_${response.status}`);
  return response.status === 204 ? null : response.json();
};
const adminHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

function isPortOpen(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
  });
}
async function waitFor(url, child, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('LOCAL_LOAD_SERVER_EXITED');
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch { /* wait for the local server */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw new Error('LOCAL_LOAD_SERVER_START_TIMEOUT');
}
function verifyCompiledSupabaseTarget() {
  let localUrlFound = false;
  const scan = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = `${directory}/${entry.name}`;
      if (entry.isDirectory()) scan(path);
      else if (/\.(js|json)$/.test(entry.name)) {
        const contents = readFileSync(path, 'utf8');
        if (contents.includes('fwqbwqxgajnrjwccdebh.supabase.co')) throw new Error('LOCAL_LOAD_BUILD_REFERENCES_SHARED_SUPABASE');
        if (contents.includes('http://127.0.0.1:54321')) localUrlFound = true;
      }
    }
  };
  scan(`${projectRoot}/.next/server`);
  if (!localUrlFound) throw new Error('LOCAL_LOAD_BUILD_TARGET_NOT_EMBEDDED');
}
function stop(child) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  else child.kill('SIGTERM');
}
function cookiesFor(session) {
  const values = [];
  const client = createServerClient(baseUrl, anonKey, { cookies: {
    getAll: () => values,
    setAll: updates => {
      for (const update of updates) {
        const old = values.find(cookie => cookie.name === update.name);
        if (old) old.value = update.value;
        else values.push({ name: update.name, value: update.value });
      }
    },
  } });
  return client.auth.setSession(session).then(({ error }) => {
    if (error) throw new Error(`LOCAL_LOAD_SESSION_COOKIE_FAILED_${error.status ?? 0}_${error.code ?? error.name ?? 'UNKNOWN'}`);
    if (!values.length) throw new Error('LOCAL_LOAD_SESSION_COOKIE_MISSING');
    return values.map(({ name, value }) => `${name}=${value}`).join('; ');
  });
}

const runId = `local-${new Date().toISOString().replaceAll(/[-:.TZ]/g, '')}-${randomUUID()}`;
const roleName = `core_load_${randomBytes(8).toString('hex')}`;
const rolePassword = randomBytes(32).toString('hex');
const authUserIds = [];
let db;
let app;
let ingress;
let roleCreated = false;
let profilesCreated = false;
try {
  if (await isPortOpen(3100) || await isPortOpen(3102)) throw new Error('LOCAL_LOAD_PORT_ALREADY_IN_USE');
  const databaseUrl = new URL(`postgresql://postgres:${encodeURIComponent(dbPassword)}@127.0.0.1:54322/postgres`);
  db = new Client({ connectionString: databaseUrl.toString() });
  await db.connect();
  const count = Number((await db.query("SELECT count(*)::int AS count FROM public.occurrences WHERE deleted_at IS NULL")).rows[0].count);
  if (count < 50_000) throw new Error('LOCAL_LOAD_HISTORY_BELOW_50000');
  const mutationRows = (await db.query("SELECT id::text FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load%' AND deleted_at IS NULL AND status NOT IN ('RESOLVIDA','CANCELADA') ORDER BY id LIMIT 11")).rows;
  if (mutationRows.length < 11) throw new Error('LOCAL_LOAD_SYNTHETIC_EDIT_TARGETS_MISSING');
  const photo = (await db.query("SELECT o.id::text FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id AND g.municipality_id='sa_patrulha' JOIN public.occurrence_private_data p ON p.occurrence_id=o.id JOIN storage.objects s ON s.name=p.photo_object_key AND s.bucket_id='core-occurrence-evidence' WHERE o.deleted_at IS NULL AND p.photo_object_key IS NOT NULL LIMIT 1")).rows[0];
  if (!photo?.id) throw new Error('LOCAL_LOAD_PRIVATE_PHOTO_TARGET_MISSING');

  await db.query(`CREATE ROLE "${roleName}" LOGIN PASSWORD '${rolePassword}' NOSUPERUSER NOBYPASSRLS NOINHERIT`);
  roleCreated = true;
  await db.query(`GRANT geoalerta_runtime,geoalerta_ingest TO "${roleName}"`);
  const runtimeUrl = new URL(databaseUrl);
  runtimeUrl.username = roleName;
  runtimeUrl.password = rolePassword;
  runtimeUrl.searchParams.set('options', '-c role=geoalerta_runtime');
  const ingestUrl = new URL(runtimeUrl);
  ingestUrl.searchParams.set('options', '-c role=geoalerta_ingest');

  const sessions = [];
  for (let index = 0; index < 10; index += 1) {
    const email = `load-${runId}-${index + 1}@example.test`;
    const password = randomBytes(24).toString('base64url');
    const created = await requestJson(`${authUrl}/admin/users`, { method: 'POST', headers: adminHeaders, body: JSON.stringify({ email, password, email_confirm: true }) });
    authUserIds.push(created.id);
    const signedIn = await requestJson(`${authUrl}/token?grant_type=password`, { method: 'POST', headers: { apikey: anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    await db.query("INSERT INTO public.admin_profiles(user_id,municipality_id,name,role,state) VALUES($1,'sa_patrulha',$2,'ADMINISTRADOR','ATIVO')", [created.id, `Synthetic load ${index + 1}`]);
    profilesCreated = true;
    const originalUser = await fetch(`${authUrl}/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${signedIn.access_token}` } });
    if (!originalUser.ok) throw new Error(`LOCAL_LOAD_AUTH_SESSION_REJECTED_${originalUser.status}`);
    sessions.push(await cookiesFor(signedIn));
    if (index === 0) process.env.CORE_LOAD_REALTIME_TOKEN = signedIn.access_token;
  }

  const appEnv = {
    ...process.env,
    NODE_ENV: 'production', VERCEL: '1', NEXT_TELEMETRY_DISABLED: '1',
    DATABASE_URL: runtimeUrl.toString(), INGEST_DATABASE_URL: ingestUrl.toString(),
    NEXT_PUBLIC_SUPABASE_URL: baseUrl, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey, SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    PHOTO_TOKEN_SECRET: randomBytes(48).toString('hex'),
    CORE_LOAD_CONFIRM_DISPOSABLE_TARGET: 'YES', CORE_LOAD_TARGET_CLASS: 'disposable', CORE_LOAD_RUN_ID: runId,
    CORE_LOAD_BASE_URL: capacityMode ? 'http://127.0.0.1:3100' : 'http://127.0.0.1:3102', CORE_LOAD_ALLOWLIST_HOST: '127.0.0.1',
    CORE_LOAD_EXPECTED_HISTORY: String(count), CORE_LOAD_CSV_SESSION: sessions[0],
    CORE_LOAD_MUTATION_OCCURRENCE_IDS: mutationRows.slice(0, 10).map(row => row.id).join(','),
    CORE_LOAD_CONFLICT_OCCURRENCE_ID: mutationRows[10].id, CORE_LOAD_PHOTO_OCCURRENCE_IDS: photo.id,
    CORE_LOAD_LATITUDE: '-29.8235', CORE_LOAD_LONGITUDE: '-50.5192', CORE_LOAD_APPLICATION_MODE: 'production',
    CORE_LOAD_REPORT_PATH: capacityMode ? 'docs/releases/core/testing/results/2026-10-12-capacity-load.json' : 'docs/releases/core/testing/results/2026-10-12-load-local.json',
  };
  for (let index = 0; index < sessions.length; index += 1) appEnv[`CORE_LOAD_SESSION_${String(index + 1).padStart(2, '0')}`] = sessions[index];

  verifyCompiledSupabaseTarget();

  app = spawn(process.execPath, ['scripts/with-env.mjs', 'next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { cwd: projectRoot, env: appEnv, stdio: 'inherit', windowsHide: true });
  appEnv.CORE_LOAD_APP_PID = String(app.pid ?? '');
  await waitFor('http://127.0.0.1:3100/', app);
  ingress = spawn(process.execPath, ['scripts/with-env.mjs', 'tsx', 'tests/fixtures/ingress-server.ts'], { cwd: projectRoot, env: appEnv, stdio: 'inherit', windowsHide: true });
  await waitFor('http://127.0.0.1:3102/__fixture/health', ingress);

  const runnerScript = capacityMode ? 'scripts/test-capacity.ts' : 'scripts/test-load.ts';
  const runner = spawnSync(process.execPath, ['--experimental-strip-types', runnerScript], { cwd: projectRoot, env: appEnv, stdio: 'inherit', windowsHide: true, timeout: 4_000_000 });
  if (runner.error?.code === 'ETIMEDOUT') throw new Error('LOCAL_LOAD_RUN_TIMEOUT');
  if (runner.status !== 0) throw new Error('LOCAL_LOAD_RUN_FAILED');
} finally {
  stop(ingress);
  stop(app);
  if (db && profilesCreated && authUserIds.length) await db.query('DELETE FROM public.admin_profiles WHERE user_id=ANY($1::uuid[])', [authUserIds]).catch(() => {});
  for (const id of authUserIds) {
    await fetch(`${authUrl}/admin/users/${id}`, { method: 'DELETE', headers: adminHeaders, signal: AbortSignal.timeout(10_000) }).catch(() => {});
  }
  if (db && roleCreated) {
    await db.query(`DROP ROLE IF EXISTS "${roleName}"`).catch(() => {});
  }
  if (db) await db.end().catch(() => {});
}
