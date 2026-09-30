import { test, expect } from '@playwright/test';
import { assertTestTarget, assertMigrationEnvironment } from '../fixtures/database';

const target = 'postgresql://fixture:fixture@127.0.0.1:5432/core_test';
const shadow = 'postgresql://fixture:fixture@127.0.0.1:5432/core_shadow';
const env = { TEST_DATABASE_ALLOWLIST: JSON.stringify([target, shadow]), DATABASE_URL: 'postgresql://fixture:fixture@localhost/operational' };

test('RNF-007 recusa alvo ausente, não permitido e lista vazia', () => {
  expect(() => assertTestTarget(undefined, env)).toThrow('ausente');
  expect(() => assertTestTarget('postgresql://localhost/other', env)).toThrow('fora');
  expect(() => assertTestTarget(target, {})).toThrow('ausente');
  expect(() => assertTestTarget(target, { TEST_DATABASE_ALLOWLIST: '{}' })).toThrow('inválida');
});
test('RNF-007 aceita somente banco explicitamente permitido', () => {
  expect(() => assertTestTarget(target, env)).not.toThrow();
});
test('RNF-007 alteração de credencial ou parâmetro não disfarça banco operacional', () => {
  expect(() => assertTestTarget(target, { ...env, DATABASE_URL: 'postgres://other:other@127.0.0.1/core_test?sslmode=require' })).toThrow('execução');
  expect(() => assertTestTarget(target, { ...env, PRODUCTION_DATABASE_URL: target })).toThrow('produção');
  expect(() => assertTestTarget(`${target}?host=production`, env)).toThrow('parâmetros');
});
test('RNF-007 recusa URL inválida e não inclui credenciais na mensagem', () => {
  for (const value of ['https://secret:secret@localhost/db', 'invalid-secret', 'postgresql://localhost/']) {
    expect(() => assertTestTarget(value, env)).toThrow('URL PostgreSQL inválida');
  }
});
test('RNF-007 migration e shadow exigem dois bancos permitidos distintos', () => {
  expect(() => assertMigrationEnvironment({ ...env, DIRECT_URL: target, SHADOW_DATABASE_URL: shadow })).not.toThrow();
  expect(() => assertMigrationEnvironment({ ...env, DIRECT_URL: target, SHADOW_DATABASE_URL: target })).toThrow('distintos');
  expect(() => assertMigrationEnvironment({ ...env, DIRECT_URL: target })).toThrow('ausente');
});
test('RNF-007 recusa pooler de transação para migration', () => {
  expect(() => assertMigrationEnvironment({ ...env, DIRECT_URL: `${target}?pgbouncer=true`, SHADOW_DATABASE_URL: shadow })).toThrow('modo sessão');
});
