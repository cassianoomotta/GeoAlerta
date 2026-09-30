import pg from 'pg';
import { readFileSync, readdirSync } from 'node:fs';
import { loadLocalEnv } from './with-env.mjs';
import { assertTestTarget } from '../tests/fixtures/database';

loadLocalEnv();
assertTestTarget(process.env.TEST_DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
try {
  await client.connect();
  const existing = await client.query("SELECT to_regclass('public.occurrences') AS table_name");
  if (existing.rows[0].table_name) throw new Error('Legado já existe; preparação não reaplica scripts históricos.');
  await client.query('BEGIN');
  await client.query(readFileSync('tests/fixtures/platform.sql', 'utf8'));
  await client.query(readFileSync('supabase.sql', 'utf8'));
  for (const file of readdirSync('supabase_migrations').filter((name) => name.endsWith('.sql')).sort()) {
    await client.query(readFileSync(`supabase_migrations/${file}`, 'utf8'));
  }
  await client.query('COMMIT');
  console.log('Legado histórico reproduzido no alvo isolado; schemas de plataforma são fixtures SQL, não serviços Supabase.');
} catch (error) {
  await client.query('ROLLBACK').catch(() => undefined);
  console.error(error instanceof Error ? error.message : 'Preparação falhou.');
  process.exitCode = 1;
} finally { await client.end(); }
