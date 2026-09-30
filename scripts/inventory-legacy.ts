import pg from 'pg';
import { writeFileSync } from 'node:fs';
import { loadLocalEnv } from './with-env.mjs';
import { assertTestTarget } from '../tests/fixtures/database';

loadLocalEnv();
assertTestTarget(process.env.TEST_DATABASE_URL);
const client = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name");
  const columns = await client.query("SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position");
  const constraints = await client.query("SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY conname");
  const indexes = await client.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename, indexname");
  const extensions = await client.query('SELECT extname, extversion FROM pg_extension ORDER BY extname');
  const policies = await client.query("SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname");
  const publications = await client.query("SELECT pubname, schemaname, tablename FROM pg_publication_tables WHERE schemaname = 'public' ORDER BY pubname, tablename");
  const expectedLegacyTables = ['occurrences', 'settings', 'resources', 'resource_movements', 'shelters', 'shelter_people', 'teams', 'team_members', 'team_locations', 'volunteers'];
  const observed = new Set(tables.rows.map((row: { table_name: string }) => row.table_name));
  const missingLegacyTables = expectedLegacyTables.filter((name) => !observed.has(name));
  // No citizen rows, credential URLs or files are exported by this command.
  const report = { baselineReady: missingLegacyTables.length === 0, missingLegacyTables, tables: tables.rows, columns: columns.rows, constraints: constraints.rows, indexes: indexes.rows, extensions: extensions.rows, policies: policies.rows, publications: publications.rows };
  const evidence = JSON.stringify(report, null, 2);
  console.log(evidence);
  if (process.argv.includes('--write-evidence')) writeFileSync('docs/releases/core/testing/results/ticket-01-observed-inventory.json', `${evidence}\n`);
  await client.query('ROLLBACK');
} catch {
  console.error('Inventário isolado indisponível; nenhuma migration foi aplicada.');
  process.exitCode = 1;
} finally { await client.end(); }
