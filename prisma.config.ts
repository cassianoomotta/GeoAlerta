import { defineConfig } from 'prisma/config';
import { loadLocalEnv } from './scripts/with-env.mjs';
import { assertMigrationEnvironment } from './tests/fixtures/database';
import { resolve, relative } from 'node:path';

loadLocalEnv();
assertMigrationEnvironment();
const testHistory = process.env.CORE_TEST_MIGRATIONS_PATH;
if (testHistory && !relative(resolve('.cache'), resolve(testHistory)).startsWith('core_test_')) throw new Error('Histórico de teste fora da pasta permitida.');
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: testHistory ?? 'prisma/migrations' },
  datasource: { url: process.env.DIRECT_URL!, shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL! },
});
