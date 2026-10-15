import { spawnSync } from 'node:child_process';
import pg from 'pg';
const inspected = spawnSync('docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', 'supabase_db_supabase-load'], { encoding: 'utf8', windowsHide: true });
if (inspected.status !== 0) throw new Error('LOCAL_LOAD_CONTAINER_UNAVAILABLE');
const env = Object.fromEntries(inspected.stdout.trim().split(/\r?\n/).map(line => {
  const at = line.indexOf('=');
  return [line.slice(0, at), line.slice(at + 1)];
}));
const db = new pg.Client({ connectionString: `postgresql://postgres:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:54322/postgres` });
await db.connect();
const result = await db.query("SELECT (SELECT count(*)::int FROM auth.users WHERE email LIKE 'load-local-%@example.test') AS auth_users,(SELECT count(*)::int FROM public.admin_profiles p JOIN auth.users u ON u.id=p.user_id WHERE u.email LIKE 'load-local-%@example.test') AS profiles,(SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'core_load_%') AS runner_roles,(SELECT count(*)::int FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load local-%') AS trial_occurrences");
const types = await db.query("SELECT type,count(*)::int AS count FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load local-%' GROUP BY type");
const targetTypes = await db.query("SELECT type,count(*)::int AS count FROM public.occurrences WHERE description LIKE 'Ticket 20 synthetic load%' AND description NOT LIKE 'Ticket 20 synthetic load local-%' AND deleted_at IS NULL AND status NOT IN ('RESOLVIDA','CANCELADA') GROUP BY type");
process.stdout.write(JSON.stringify({ ...result.rows[0], trialTypes: types.rows, eligibleTypes: targetTypes.rows }));
await db.end();
