import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';

function envFromContainer(name) {
  const result = spawnSync('docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', name], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0) throw new Error('LOCAL_LOAD_CONTAINER_UNAVAILABLE');
  return Object.fromEntries(result.stdout.trim().split(/\r?\n/).map(line => {
    const at = line.indexOf('=');
    return [line.slice(0, at), line.slice(at + 1)];
  }));
}
const databaseEnv = envFromContainer('supabase_db_supabase-load');
const authEnv = envFromContainer('supabase_auth_supabase-load');
const baseUrl = 'http://127.0.0.1:54321';
const sign = role => {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ iss: 'supabase', role, iat: now, exp: now + 10_800 })).toString('base64url')}`;
  return `${unsigned}.${createHmac('sha256', authEnv.GOTRUE_JWT_SECRET).update(unsigned).digest('base64url')}`;
};
const serviceKey = sign('service_role');
const db = new pg.Client({ connectionString: `postgresql://postgres:${encodeURIComponent(databaseEnv.POSTGRES_PASSWORD)}@127.0.0.1:54322/postgres` });
await db.connect();
const users = (await db.query("SELECT id::text FROM auth.users WHERE email LIKE 'load-local-%@example.test'")).rows.map(row => row.id);
const occurrences = (await db.query("SELECT id::text FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load local-%'")).rows.map(row => row.id);
const roles = (await db.query("SELECT rolname FROM pg_roles WHERE rolname ~ '^core_load_[0-9a-f]{16}$'")).rows.map(row => row.rolname);
await db.query('BEGIN');
try {
  if (occurrences.length) {
    await db.query('DELETE FROM public.occurrence_alerts WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.occurrence_service_records WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.occurrence_classification_zones WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.idempotency_keys WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.occurrence_events WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.occurrence_private_data WHERE occurrence_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.audit_events WHERE entity_id=ANY($1::uuid[])', [occurrences]);
    await db.query('DELETE FROM public.occurrences WHERE id=ANY($1::uuid[])', [occurrences]);
  }
  if (users.length) await db.query('DELETE FROM public.admin_profiles WHERE user_id=ANY($1::uuid[])', [users]);
  await db.query('COMMIT');
} catch (error) { await db.query('ROLLBACK'); throw error; }
for (const id of users) {
  const response = await fetch(`${baseUrl}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`LOCAL_LOAD_AUTH_CLEANUP_FAILED_${response.status}`);
}
for (const role of roles) await db.query(`DROP ROLE IF EXISTS "${role}"`);
const remaining = await db.query("SELECT (SELECT count(*)::int FROM auth.users WHERE email LIKE 'load-local-%@example.test') AS auth_users,(SELECT count(*)::int FROM public.admin_profiles p JOIN auth.users u ON u.id=p.user_id WHERE u.email LIKE 'load-local-%@example.test') AS profiles,(SELECT count(*)::int FROM pg_roles WHERE rolname ~ '^core_load_[0-9a-f]{16}$') AS runner_roles,(SELECT count(*)::int FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load local-%') AS trial_occurrences");
process.stdout.write(JSON.stringify({ cleanedAuthUsers: users.length, cleanedOccurrences: occurrences.length, cleanedRunnerRoles: roles.length, remaining: remaining.rows[0] }));
await db.end();
