import { expect, test } from '@playwright/test';
import { provisionPendingUser } from '../../src/features/access/application/admin';
import { parseCreateGroupUser, parseCreateManagedUser, parseManagedGroup, parseUpdateManagedUser, AdminInputError } from '../../src/features/access/domain/admin';
import { can } from '../../src/features/access/domain/permissions';
import type { Actor } from '../../src/features/access/contracts';

const groupId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
const admin: Actor = { userId: '33333333-3333-4333-8333-333333333333', municipalityId: 'sa_patrulha', role: 'ADMINISTRADOR', state: 'ATIVO', groupIds: [] };

test('RF-013 normaliza cadastro e aceita papéis, estados e grupos válidos', () => {
  expect(parseCreateManagedUser({ email: '  Ana@Exemplo.com ', name: ' Ana Costa ', phone: ' ', role: 'GESTOR', groupIds: [groupId] })).toEqual({ email: 'ana@exemplo.com', name: 'Ana Costa', phone: null, role: 'GESTOR', groupIds: [groupId] });
  expect(parseCreateManagedUser({ email: 'voluntario@example.com', name: ' Ana Voluntária ', phone: '', role: 'VOLUNTARIO', groupIds: [groupId] })).toMatchObject({ role: 'VOLUNTARIO', groupIds: [groupId] });
  expect(parseUpdateManagedUser({ userId, name: ' Ana Costa ', phone: ' (51) 99999-0000 ', role: 'OPERADOR', state: 'SUSPENSO', groupIds: [groupId] })).toEqual({ userId, name: 'Ana Costa', phone: '(51) 99999-0000', role: 'OPERADOR', state: 'SUSPENSO', groupIds: [groupId] });
  expect(parseManagedGroup({ name: ' Defesa Civil ', isDefault: true })).toEqual({ name: 'Defesa Civil', isDefault: true });
});

test('RF-013 novo cadastro feito dentro do grupo fica vinculado somente ao grupo selecionado', () => {
  expect(parseCreateGroupUser({ email: 'nova@example.com', name: ' Nova pessoa ', phone: '', role: 'OPERADOR', groupId })).toEqual({
    email: 'nova@example.com', name: 'Nova pessoa', phone: null, role: 'OPERADOR', groupIds: [groupId],
  });
  expect(() => parseCreateGroupUser({ email: 'nova@example.com', name: 'Nova pessoa', phone: '', role: 'OPERADOR', groupId: 'invalid' })).toThrow(AdminInputError);
});

test('RF-013 rejeita papel/estado desconhecido, grupo duplicado e campos de elevação de privilégio', () => {
  for (const input of [
    { email: 'x@example.com', name: 'X', phone: '', role: 'ROOT', groupIds: [] },
    { email: 'x@example.com', name: 'X', phone: '', role: 'GESTOR', groupIds: [groupId, groupId] },
    { email: 'x@example.com', name: 'X', phone: '', role: 'GESTOR', groupIds: [], state: 'ATIVO' },
  ]) expect(() => parseCreateManagedUser(input)).toThrow(AdminInputError);
  expect(() => parseUpdateManagedUser({ userId, role: 'GESTOR', state: 'UNKNOWN', groupIds: [] })).toThrow(AdminInputError);
  expect(() => parseUpdateManagedUser({ userId, name: ' ', phone: null, role: 'GESTOR', state: 'ATIVO', groupIds: [] })).toThrow(AdminInputError);
  expect(() => parseManagedGroup({ name: 'Grupo', isDefault: true, municipalityId: 'outro' })).toThrow(AdminInputError);
});

test('RF-013 só ator Administrador ATIVO pode administrar o próprio município', () => {
  expect(can(admin, 'administer', { municipalityId: 'sa_patrulha' })).toBe(true);
  expect(can({ ...admin, role: 'GESTOR' }, 'administer', { municipalityId: 'sa_patrulha' })).toBe(false);
  expect(can({ ...admin, state: 'SUSPENSO' }, 'administer', { municipalityId: 'sa_patrulha' })).toBe(false);
  expect(can(admin, 'administer', { municipalityId: 'outro' })).toBe(false);
});

test('RF-013 falha ao criar link mantém conta PENDENTE e permite retomada auditável', async () => {
  const pending: string[] = [];
  const audits: string[] = [];
  const user = parseCreateManagedUser({ email: 'ana@example.com', name: 'Ana', phone: '', role: 'CONSULTA', groupIds: [] });
  const ports = {
    async ensureAuthUser() { return { userId, existed: false }; },
    async savePending(id: string, _details: typeof user, retried: boolean) { pending.push(id); audits.push(retried ? 'retry' : 'created'); },
    async createLink() { throw new Error('AUTH_LINK_DOWN'); },
  };
  await expect(provisionPendingUser(user, ports)).rejects.toThrow('AUTH_LINK_DOWN');
  expect(pending).toEqual([userId]);
  const resumed = await provisionPendingUser(user, { ...ports, ensureAuthUser: async () => ({ userId, existed: true }), createLink: async () => 'https://auth.example/action' });
  expect(resumed).toMatchObject({ userId, state: 'PENDENTE', retried: true });
  expect(audits).toEqual(['created', 'retry']);
});
