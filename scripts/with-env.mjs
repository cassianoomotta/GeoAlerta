import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function loadLocalEnv(root = projectRoot) {
  const alternatives = readdirSync(root).filter((name) => name.startsWith('.env.') || name === '.envrc');
  if (alternatives.length) throw new Error('Use somente .env na raiz; arquivos alternativos de ambiente foram encontrados.');
  const path = resolve(root, '.env');
  if (existsSync(path)) process.loadEnvFile(path);
  else if (!process.env.CI) throw new Error('Arquivo .env da raiz ausente. CI deve injetar as variáveis.');
  process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve(root, '.cache', 'playwright');
}

export function resolveExecutable(name, root = projectRoot) {
  const packages = { next: 'next', prisma: 'prisma', playwright: '@playwright/test', tsx: 'tsx', eslint: 'eslint' };
  const packageName = packages[name];
  if (!packageName) throw new Error('Executável local não permitido.');
  const require = createRequire(resolve(root, 'package.json'));
  const manifestPath = require.resolve(`${packageName}/package.json`);
  const manifest = require(manifestPath);
  const entry = typeof manifest.bin === 'string' ? manifest.bin : manifest.bin?.[name];
  if (!entry) throw new Error('Executável não encontrado no pacote local.');
  return resolve(dirname(manifestPath), entry);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    loadLocalEnv();
    const [name, ...args] = process.argv.slice(2);
    const child = spawn(process.execPath, ['--max-http-header-size=65536', resolveExecutable(name), ...args], {
      cwd: projectRoot, env: process.env, stdio: 'inherit', shell: false,
    });
    child.on('error', () => { console.error('Não foi possível iniciar o executável local.'); process.exitCode = 1; });
    child.on('exit', (code) => { process.exitCode = code ?? 1; });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
