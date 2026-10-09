import { test, expect } from '@playwright/test';
import { can, canEnterPanel, type Capability } from '../../src/features/access/domain/permissions';
import type { Actor, Role } from '../../src/features/access/contracts';

const actor = (role: Role): Actor => ({ userId:'synthetic',role,groupIds:['a','b'],municipalityId:'municipality-a',state:'ATIVO' });
const scope = { municipalityId:'municipality-a',groupId:'b' };
test('RF-005 ausência de identidade e estados não ativos negam painel e capacidades', () => {
  expect(canEnterPanel(null)).toBe(false);
  for (const state of ['PENDENTE','SUSPENSO','DESATIVADO'] as const) {
    const user = {...actor('ADMINISTRADOR'),state};
    expect(canEnterPanel(user)).toBe(false); expect(can(user,'administer',scope)).toBe(false);
  }
});
test('RNF-001 grupos e município limitam capacidades inclusive com múltiplos grupos', () => {
  const user = actor('OPERADOR');
  expect(can(user,'operate',scope)).toBe(true);
  expect(can(user,'operate',{...scope,groupId:'a'})).toBe(true);
  expect(can(user,'operate',{...scope,groupId:'c'})).toBe(false);
  expect(can(user,'operate',{...scope,municipalityId:'municipality-b'})).toBe(false);
  expect(canEnterPanel({...user,groupIds:[]})).toBe(false);
  expect(canEnterPanel({...user,municipalityId:''})).toBe(false);
});
test('RNF-001 matriz de capacidades aplica o PRD a cada papel', () => {
  const expected: Record<Role, Capability[]> = { CONSULTA:['read'], VOLUNTARIO:['read'], OPERADOR:['read','privateData','operate'], GESTOR:['read','privateData','operate','reclassify','export'], ADMINISTRADOR:['read','privateData','operate','reclassify','export','administer'] };
  for (const role of Object.keys(expected) as Role[]) {
    for (const capability of ['read','privateData','operate','reclassify','export','administer'] as const) {
      expect(can(actor(role),capability,scope), `${role}:${capability}`).toBe(expected[role].includes(capability));
    }
  }
});
test('RNF-001 administrador tem escopo municipal sem conceder acesso a outro município', () => {
  const user = {...actor('ADMINISTRADOR'),groupIds:[]};
  expect(can(user,'administer',scope)).toBe(true);
  expect(can(user,'read',{...scope,municipalityId:'municipality-b'})).toBe(false);
});

test('VOLUNTARIO pode apenas ler dados permitidos no grupo vinculado', () => {
  const volunteer = actor('VOLUNTARIO' as Role);
  expect(can(volunteer, 'read', scope)).toBe(true);
  for (const capability of ['privateData', 'operate', 'reclassify', 'export', 'administer'] as const) {
    expect(can(volunteer, capability, scope)).toBe(false);
  }
  expect(can(volunteer, 'read', { ...scope, groupId: 'outro-grupo' })).toBe(false);
});
