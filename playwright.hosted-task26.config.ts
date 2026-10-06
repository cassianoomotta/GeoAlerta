import {defineConfig,devices} from '@playwright/test';
import {resolve} from 'node:path';

const ref=process.env.TASK26_STAGE_PROJECT_REF;
const supabaseUrl=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const runtimeUrl=process.env.DATABASE_URL;
const ingestUrl=process.env.INGEST_DATABASE_URL;
if(!ref||!supabaseUrl||!anonKey||!runtimeUrl||!ingestUrl)throw new Error('Ambiente da homologação incompleto.');
if(new URL(supabaseUrl).hostname!==`${ref}.supabase.co`)throw new Error('A URL não corresponde ao projeto de homologação explicitamente permitido.');
for(const [name,value,role] of [['DATABASE_URL',runtimeUrl,'geoalerta_runtime'],['INGEST_DATABASE_URL',ingestUrl,'geoalerta_ingest']] as const){
  const connection=new URL(value);
  const direct=connection.hostname===`db.${ref}.supabase.co`&&connection.username===role;
  const sharedPooler=connection.hostname.endsWith('.pooler.supabase.com')&&connection.username===`${role}.${ref}`;
  if(!direct&&!sharedPooler)throw new Error(`${name} deve usar a role restrita ${role} e apontar para a homologação permitida.`);
}

const root=process.cwd();
const baseURL='http://127.0.0.1:3137';
export default defineConfig({
  testDir:'./tests/e2e',
  testMatch:'hosted-core-notifications-reconnect.spec.ts',
  fullyParallel:false,
  workers:1,
  timeout:150_000,
  expect:{timeout:30_000},
  reporter:'list',
  outputDir:resolve(root,'.cache','task26-hosted-test-results'),
  use:{...devices['Desktop Chrome'],baseURL,channel:'chrome',headless:true,trace:'off',screenshot:'off',video:'off'},
  webServer:{
    command:'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3137',
    cwd:root,
    url:`${baseURL}/login`,
    reuseExistingServer:false,
    timeout:120_000,
    env:{
      CORE_TEST_NEXT_DIST_DIR:'.cache/next-task26-hosted',
      DATABASE_URL:runtimeUrl,
      INGEST_DATABASE_URL:ingestUrl,
      VERCEL:'1',
      NEXT_PUBLIC_SUPABASE_URL:supabaseUrl,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:anonKey,
      SUPABASE_SERVICE_ROLE_KEY:'',
      CORE_ADMIN_DATABASE_URL:'',
    },
  },
});
