import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/design-system',
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3111',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev -- --hostname 127.0.0.1 --port 3111',
    url: 'http://127.0.0.1:3111',
    reuseExistingServer: false,
    env: { CORE_TEST_NEXT_DIST_DIR: '.cache/design-system-test' },
  },
});
