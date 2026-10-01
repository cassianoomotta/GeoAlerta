import { defineConfig, devices } from '@playwright/test';
import { loadLocalEnv } from './scripts/with-env.mjs';
import { prepareAccessTests } from './tests/fixtures/access';

loadLocalEnv();
const baseURL = 'http://127.0.0.1:3102';
const browsers = ['chromium', 'firefox', 'webkit', 'mobile-chromium', 'mobile-webkit'];
const requestedProjects = process.argv.flatMap((arg, index) => arg.startsWith('--project=') ? [arg.slice(10)] : arg === '--project' ? [process.argv[index + 1]] : []);
const needsServer = (requestedProjects.length === 0 || requestedProjects.some((name) => browsers.includes(name) || name === 'api')) && !process.argv.includes('--list');
const needsAccessDatabase=needsServer || requestedProjects.includes('database');
// Workers reload this config without the CLI project filter and inherit the prepared environment.
if(process.env.TEST_WORKER_INDEX === undefined && needsAccessDatabase && !process.argv.includes('--list')) process.env.CORE_ACCESS_RUNTIME_URL=await prepareAccessTests();

export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]],
  use: { baseURL, locale: 'pt-BR', timezoneId: 'America/Sao_Paulo', trace: 'on-first-retry', screenshot: 'only-on-failure' },
  webServer: needsServer ? [
    {command:'node scripts/with-env.mjs tsx tests/fixtures/auth-server.ts',url:'http://127.0.0.1:3101/health',reuseExistingServer:false},
    {command:'npm run dev -- --hostname 127.0.0.1 --port 3100',url:'http://127.0.0.1:3100',reuseExistingServer:false,env:{DATABASE_URL:process.env.CORE_ACCESS_RUNTIME_URL!,INGEST_DATABASE_URL:process.env.CORE_ACCESS_RUNTIME_URL!.replace('geoalerta_runtime','geoalerta_ingest'),VERCEL:'1',NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3101',NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon-key'}},
    {command:'node scripts/with-env.mjs tsx tests/fixtures/ingress-server.ts',url:'http://127.0.0.1:3102/__fixture/health',reuseExistingServer:false},
  ] : undefined,
  projects: [
    { name: 'unit', testMatch: /unit\/.*\.spec\.ts/ },
    { name: 'api', testMatch: /api\/.*\.spec\.ts/ },
    { name: 'database', testMatch: /database\/.*\.spec\.ts/ },
    { name: 'chromium', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', testMatch: /e2e\/.*\.spec\.ts/, use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chromium', testMatch: /e2e\/public-occurrence\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'mobile-webkit', testMatch: /e2e\/public-occurrence\.spec\.ts/, use: { ...devices['iPhone 13'] } },
  ],
});
