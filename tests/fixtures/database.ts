export type DatabaseEnvironment = Record<string, string | undefined>;

export function databaseIdentity(value: string): string {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || url.pathname === '/' || !url.pathname) throw new Error();
    // Query parameters and credentials do not establish a different database.
    if ([...url.searchParams.keys()].some((key) => !['sslmode', 'sslrootcert', 'connection_limit', 'pool_timeout', 'pgbouncer', 'schema'].includes(key))) throw new Error();
    if (url.searchParams.has('schema') && !/^core_test_[a-z0-9_]+$/.test(url.searchParams.get('schema')!)) throw new Error();
    return `${url.hostname.toLowerCase()}:${url.port || '5432'}${decodeURIComponent(url.pathname)}`;
  } catch {
    throw new Error('URL PostgreSQL inválida ou com parâmetros não permitidos.');
  }
}

export function assertTestTarget(value: string | undefined, env: DatabaseEnvironment = process.env): asserts value is string {
  if (!value) throw new Error('TEST_DATABASE_URL ausente; nenhuma escrita autorizada.');
  const target = databaseIdentity(value);
  let allowed: unknown;
  try { allowed = JSON.parse(env.TEST_DATABASE_ALLOWLIST || '[]'); } catch { throw new Error('TEST_DATABASE_ALLOWLIST deve ser um array JSON de URLs isoladas.'); }
  if (!Array.isArray(allowed) || !allowed.length || !allowed.every((entry) => typeof entry === 'string')) throw new Error('Lista explícita de bancos de teste ausente ou inválida.');
  if (!allowed.some((entry) => databaseIdentity(entry) === target)) throw new Error('Destino fora da lista explícita de teste; nenhuma escrita autorizada.');
  for (const name of ['DATABASE_URL', 'PRODUCTION_DATABASE_URL']) {
    if (env[name] && databaseIdentity(env[name]) === target) throw new Error('Destino coincide com banco de execução/produção; nenhuma escrita autorizada.');
  }
}

export function assertMigrationEnvironment(env: DatabaseEnvironment = process.env) {
  assertTestTarget(env.DIRECT_URL, env);
  assertTestTarget(env.SHADOW_DATABASE_URL, env);
  if (databaseIdentity(env.DIRECT_URL!) === databaseIdentity(env.SHADOW_DATABASE_URL!)) throw new Error('Migration e shadow devem usar bancos distintos.');
  if (env.DIRECT_URL?.includes('pgbouncer=true') || new URL(env.DIRECT_URL!).port === '6543') throw new Error('Migrations exigem conexão direta ou pooler em modo sessão.');
}
