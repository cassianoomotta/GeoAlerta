import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadLocalEnv, resolveExecutable, projectRoot } from '../../scripts/with-env.mjs';

test('RNF-007 carregador recusa arquivos alternativos de ambiente', () => {
  const root = mkdtempSync(join(tmpdir(), 'geoalerta-env-'));
  try {
    writeFileSync(join(root, '.env.local'), '');
    expect(() => loadLocalEnv(root)).toThrow('somente .env');
  } finally { rmSync(root, { recursive: true }); }
});
test('RNF-007 resolve ferramentas locais e preserva código de falha', () => {
  for (const name of ['next', 'prisma', 'playwright', 'tsx']) expect(resolveExecutable(name)).toContain('node_modules');
  expect(() => resolveExecutable('arbitrary-command')).toThrow('não permitido');
  const result = spawnSync(process.execPath, [join(projectRoot, 'scripts/with-env.mjs'), 'arbitrary-command'], { encoding: 'utf8' });
  expect(result.status).toBe(1);
  expect(result.stderr).toContain('não permitido');
});
