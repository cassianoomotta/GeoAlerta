import { readFile } from 'node:fs/promises';
import pg from 'pg';

const reportPath = new URL('../docs/releases/core/testing/results/2026-10-12-capacity-load.json', import.meta.url);
const report = JSON.parse(await readFile(reportPath, 'utf8'));
const inspect = await import('node:child_process').then(({ spawnSync }) => spawnSync(
  'docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', 'supabase_db_supabase-load'],
  { encoding: 'utf8', windowsHide: true },
));
if (inspect.status !== 0) throw new Error('LOCAL_LOAD_CONTAINER_UNAVAILABLE');
const env = Object.fromEntries(inspect.stdout.trim().split(/\r?\n/).map((line) => {
  const at = line.indexOf('=');
  return [line.slice(0, at), line.slice(at + 1)];
}));
const db = new pg.Client({ connectionString: `postgresql://postgres:${encodeURIComponent(env.POSTGRES_PASSWORD)}@127.0.0.1:54322/postgres` });
await db.connect();
try {
  const emailPrefix = `load-${report.runId}-%@example.test`;
  const result = await db.query(`
    SELECT
      (SELECT count(*)::int FROM auth.users WHERE email LIKE $1) AS auth_users,
      (SELECT count(*)::int FROM public.admin_profiles p JOIN auth.users u ON u.id=p.user_id WHERE u.email LIKE $1) AS profiles,
      (SELECT count(*)::int FROM pg_roles WHERE rolname LIKE 'core_load_%') AS runner_roles
  `, [emailPrefix]);
  process.stdout.write(JSON.stringify({ runId: report.runId, ...result.rows[0] }));
} finally {
  await db.end();
}
