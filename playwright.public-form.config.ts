import {defineConfig,devices} from '@playwright/test';
import {loadLocalEnv} from './scripts/with-env.mjs';

loadLocalEnv();
// Every public API is intercepted by these tests; no database or Storage writes.
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'public-form-validation.spec.ts',workers:1,timeout:120_000,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:3105',locale:'pt-BR',navigationTimeout:90_000},
  webServer:{command:'node scripts/with-env.mjs next dev --webpack --hostname 127.0.0.1 --port 3105',url:'http://127.0.0.1:3105/institutional/defesa-civil-rs.png',timeout:180_000,reuseExistingServer:false,env:{CORE_TEST_NEXT_DIST_DIR:'.cache/next-public-form'}},
  projects:[
    {name:'chromium',use:{...devices['Desktop Chrome']}},
    {name:'mobile-webkit',use:{...devices['iPhone 13']}},
  ],
});
