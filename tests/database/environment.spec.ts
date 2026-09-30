import { test } from '@playwright/test';
import { assertTestTarget, assertMigrationEnvironment } from '../fixtures/database';

test('RNF-007 pré-requisitos reais de banco isolado estão configurados', () => {
  // Failure is an impediment, never a skipped test or a claim of migration success.
  assertTestTarget(process.env.TEST_DATABASE_URL);
  assertMigrationEnvironment();
});
