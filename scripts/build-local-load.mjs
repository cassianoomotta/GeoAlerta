import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { loadLocalEnv, projectRoot } from './with-env.mjs';

loadLocalEnv(projectRoot);
const inspected = spawnSync('docker', ['inspect', '--format', '{{range .Config.Env}}{{println .}}{{end}}', 'supabase_auth_supabase-load'], { encoding: 'utf8', windowsHide: true });
if (inspected.status !== 0) throw new Error('LOCAL_AUTH_CONTAINER_UNAVAILABLE');
const authEnv = Object.fromEntries(inspected.stdout.trim().split(/\r?\n/).map(line => {
  const at = line.indexOf('=');
  return at < 0 ? [line, ''] : [line.slice(0, at), line.slice(at + 1)];
}));
const secret = authEnv.GOTRUE_JWT_SECRET;
if (!secret) throw new Error('LOCAL_AUTH_SIGNING_KEY_UNAVAILABLE');
const key = role => {
  const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ iss: 'supabase', role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 10_800 })).toString('base64url');
  const unsigned = `${head}.${body}`;
  return `${unsigned}.${createHmac('sha256', secret).update(unsigned).digest('base64url')}`;
};
const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: key('anon'),
  SUPABASE_SERVICE_ROLE_KEY: key('service_role'),
};
const result = spawnSync(process.execPath, ['scripts/with-env.mjs', 'next', 'build'], { cwd: projectRoot, env, stdio: 'inherit', windowsHide: true });
if (result.status !== 0) throw new Error('LOCAL_LOAD_BUILD_FAILED');
