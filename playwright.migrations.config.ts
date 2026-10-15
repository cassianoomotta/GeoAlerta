import { defineConfig } from '@playwright/test';
import { loadLocalEnv } from './scripts/with-env.mjs';

loadLocalEnv();

export default defineConfig({
  testDir: './tests/database',
  testMatch: /migrations\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  reporter: [['list']],
});
