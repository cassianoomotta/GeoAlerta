import { expect, test } from '@playwright/test';
import type { Actor, Role } from '@/features/access/contracts';
import type { Status } from '@/features/occurrences/contracts';
import {
  authorizeOccurrenceMutation,
  OccurrenceMutationError,
  parseOccurrenceMutation,
  type MutableOccurrence,
  type TransitionRule,
} from '@/features/occurrences/domain/mutation';
import { mutateOccurrence, type MutateOccurrencePorts } from '@/features/occurrences/application/mutate-occurrence';

const groupA = '10000000-0000-4000-8000-000000000001';
const groupB = '10000000-0000-4000-8000-000000000002';
const occurrenceId = '30000000-0000-4000-8000-000000000001';
const userId = '20000000-0000-4000-8000-000000000001';

function actor(role: Role = 'OPERADOR', groupIds = [groupA]): Actor {
  return { userId, role, groupIds, municipalityId: 'sa_patrulha', state: 'ATIVO' };
}

function occurrence(overrides: Partial<MutableOccurrence> = {}): MutableOccurrence {
  return {
    id: occurrenceId,
    type: 'Alagamento',
    description: 'Rua inundada',
    status: 'NOVA',
    priority: 'NORMAL',
    groupId: groupA,
    version: 4,
    deletedAt: null,
    ...overrides,
  };
}

function transition(roles: Role[] = ['OPERADOR', 'GESTOR', 'ADMINISTRADOR'], overrides: Partial<TransitionRule> = {}): TransitionRule {
  return { enabled: true, roles, reasonRequired: false, ...overrides };
}

function fakePorts(initial = occurrence(), options: { auditFails?: boolean } = {}) {
  const state = { current: initial };
  const saved: Parameters<MutateOccurrencePorts['saveAtomically']>[0][] = [];
  const ports: MutateOccurrencePorts = {
    getOccurrence: async (id) => id === state.current.id ? { ...state.current } : null,
    groupExistsInMunicipality: async (id, municipalityId) => municipalityId === 'sa_patrulha' && [groupA, groupB].includes(id),
    getTransition: async () => transition(),
    saveAtomically: async (command) => {
      if (state.current.version !== command.expectedVersion) return false;
      if (options.auditFails) throw new Error('audit insert failed');
      saved.push(command);
      state.current = {
        ...state.current,
        type: command.type ?? state.current.type,
        description: command.description ?? state.current.description,
        status: command.status ?? state.current.status,
        priority: command.priority ?? state.current.priority,
        groupId: command.groupId,
        version: command.expectedVersion + 1,
        deletedAt: command.deletedAt === undefined ? state.current.deletedAt : command.deletedAt ? new Date() : null,
      };
      return true;
    },
  };
  return { state, saved, ports };
}

test('RF-011 parser normalizes editable fields and rejects invalid versions, groups, and empty edits', () => {
  expect(parseOccurrenceMutation({ expectedVersion: 4, command: { kind: 'edit', type: '  Alagamento  ', description: '  Rua  ' } })).toEqual({
    expectedVersion: 4,
    command: { kind: 'edit', type: 'Alagamento', description: 'Rua' },
  });
  for (const input of [
    { expectedVersion: 0, command: { kind: 'edit', type: 'Alagamento' } },
    { expectedVersion: 1, command: { kind: 'edit' } },
    { expectedVersion: 1, command: { kind: 'edit', groupId: 'not-a-uuid' } },
    { expectedVersion: 1, command: { kind: 'transition', target: 'REMOVIDA' } },
  ]) {
    expect(() => parseOccurrenceMutation(input)).toThrow(OccurrenceMutationError);
  }
});

test('climate event link changes require an authorized manager, current version and no deleted record, but no reason', async () => {
  const payload = parseOccurrenceMutation({ expectedVersion: 4, command: { kind: 'climateEvent', climateEventId: null } });
  for(const command of [
    {kind:'climateEvent',climateEventId:'bad'},
    {kind:'climateEvent',climateEventId:null,reason:'x'.repeat(501)},
    {kind:'climateEvent',climateEventId:null,actorId:userId},
  ])expect(()=>parseOccurrenceMutation({expectedVersion:4,command})).toThrow(OccurrenceMutationError);
  const fake = fakePorts(occurrence({ climateEventId: '90000000-0000-4000-8000-000000000035' }));
  const result = await mutateOccurrence(actor('GESTOR'), occurrenceId, payload.expectedVersion, payload.command, fake.ports);
  expect(result.version).toBe(5);
  expect(fake.saved[0]).toMatchObject({ eventKind: 'OCCURRENCE_CLIMATE_EVENT_LINK_CHANGED', reason: null, changes: { climateEventId: { from: '90000000-0000-4000-8000-000000000035', to: null } } });
  await expect(mutateOccurrence(actor('OPERADOR'), occurrenceId, 4, payload.command, fakePorts(occurrence({ climateEventId: '90000000-0000-4000-8000-000000000035' })).ports)).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 3, payload.command, fake.ports)).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 4, payload.command, fakePorts(occurrence({ deletedAt: new Date() })).ports)).rejects.toMatchObject({ code: 'NOT_FOUND' });
});

test('RF-011 authorized edit records actor, differences and group reassign in one version', async () => {
  const fake = fakePorts();
  const result = await mutateOccurrence(actor('GESTOR', [groupA, groupB]), occurrenceId, 4,
    { kind: 'edit', type: 'Enchente', description: 'Avenida inundada', groupId: groupB }, fake.ports);
  expect(result).toEqual({ id: occurrenceId, version: 5, status: 'NOVA', priority: 'NORMAL', groupId: groupB, deletedAt: false });
  expect(fake.saved).toHaveLength(1);
  expect(fake.saved[0]).toMatchObject({
    actorId: userId,
    eventKind: 'OCCURRENCE_EDITED',
    changes: {
      type: { from: 'Alagamento', to: 'Enchente' },
      description: { from: 'Rua inundada', to: 'Avenida inundada' },
      groupId: { from: groupA, to: groupB },
    },
  });
  expect(fake.state.current.version).toBe(5);
});

test('RF-011 operator cannot reassign to an unauthorized group and deleted rows cannot mutate', async () => {
  const fake = fakePorts();
  await expect(mutateOccurrence(actor(), occurrenceId, 4, { kind: 'edit', groupId: groupB }, fake.ports))
    .rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' });
  expect(fake.saved).toHaveLength(0);

  const deleted = fakePorts(occurrence({ deletedAt: new Date() }));
  await expect(mutateOccurrence(actor(), occurrenceId, 4, { kind: 'edit', type: 'Novo tipo' }, deleted.ports))
    .rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  expect(deleted.saved).toHaveLength(0);
});

test('RF-015 configured transition matrix accepts every ordinary transition and records event', async () => {
  const cases: [Status, Status][] = [
    ['NOVA', 'EM_TRIAGEM'], ['NOVA', 'CANCELADA'],
    ['EM_TRIAGEM', 'EM_ATENDIMENTO'], ['EM_TRIAGEM', 'CANCELADA'],
    ['EM_ATENDIMENTO', 'RESOLVIDA'], ['EM_ATENDIMENTO', 'EM_TRIAGEM'],
  ];
  for (const [from, target] of cases) {
    const fake = fakePorts(occurrence({ status: from }));
    const result = await mutateOccurrence(actor(), occurrenceId, 4, { kind: 'transition', target }, fake.ports);
    expect(result).toMatchObject({ status: target, version: 5 });
    expect(fake.saved[0]).toMatchObject({
      actorId: userId,
      eventKind: 'STATUS_TRANSITIONED',
      changes: { status: { from, to: target } },
    });
  }
});

test('RF-015 disabled or role-denied transitions fail without saving', async () => {
  const fake = fakePorts();
  fake.ports.getTransition = async () => transition(['GESTOR'], { enabled: false });
  await expect(mutateOccurrence(actor(), occurrenceId, 4, { kind: 'transition', target: 'EM_TRIAGEM' }, fake.ports))
    .rejects.toMatchObject({ status: 422, code: 'TRANSITION_NOT_ALLOWED' });
  expect(fake.saved).toHaveLength(0);
});

test('RF-015 only Gestor/Admin can reopen with a persisted justification requirement', async () => {
  const terminal = occurrence({ status: 'RESOLVIDA' });
  const fakeOperator = fakePorts(terminal);
  fakeOperator.ports.getTransition = async () => transition(['GESTOR', 'ADMINISTRADOR'], { reasonRequired: true });
  await expect(mutateOccurrence(actor(), occurrenceId, 4, { kind: 'transition', target: 'EM_TRIAGEM', reason: 'Motivo suficiente' }, fakeOperator.ports))
    .rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' });
  expect(fakeOperator.saved).toHaveLength(0);

  const fakeManager = fakePorts(terminal);
  fakeManager.ports.getTransition = async () => transition(['GESTOR', 'ADMINISTRADOR'], { reasonRequired: true });
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 4, { kind: 'transition', target: 'EM_TRIAGEM', reason: 'Motivo' }, fakeManager.ports))
    .rejects.toMatchObject({ status: 422, code: 'REASON_REQUIRED' });
  const result = await mutateOccurrence(actor('GESTOR'), occurrenceId, 4, { kind: 'transition', target: 'EM_TRIAGEM', reason: 'Equipe confirmou reabertura' }, fakeManager.ports);
  expect(result.status).toBe('EM_TRIAGEM');
  expect(fakeManager.saved[0].reason).toBe('Equipe confirmou reabertura');
});

test('RNF-005 stale concurrent version returns 409 and exposes no overwrite', async () => {
  const fake = fakePorts();
  const writes = await Promise.allSettled([
    mutateOccurrence(actor(), occurrenceId, 4, { kind: 'edit', type: 'Enchente' }, fake.ports),
    mutateOccurrence(actor(), occurrenceId, 4, { kind: 'edit', type: 'Enxurrada' }, fake.ports),
  ]);
  expect(writes.filter((write) => write.status === 'fulfilled')).toHaveLength(1);
  expect(writes.filter((write) => write.status === 'rejected')).toHaveLength(1);
  const failure = writes.find((write) => write.status === 'rejected');
  expect(failure).toMatchObject({ reason: { status: 409, code: 'VERSION_CONFLICT' } });
  expect(fake.state.current.version).toBe(5);
  expect(['Enchente', 'Enxurrada']).toContain(fake.state.current.type);
});

test('RNF-005 audit failure leaves occurrence and version unchanged in the atomic port', async () => {
  const fake = fakePorts(occurrence(), { auditFails: true });
  await expect(mutateOccurrence(actor(), occurrenceId, 4, { kind: 'edit', type: 'Enchente' }, fake.ports)).rejects.toThrow('audit insert failed');
  expect(fake.state.current).toEqual(occurrence());
  expect(fake.saved).toHaveLength(0);
});

test('wrong expected version returns 409 before attempting a write', async () => {
  const fake = fakePorts();
  await expect(mutateOccurrence(actor(), occurrenceId, 3, { kind: 'edit', type: 'Enchente' }, fake.ports))
    .rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT' });
  expect(fake.saved).toHaveLength(0);
});

test('RF-011 gestor reclassifies priority with a required reason and increments one version', async () => {
  const fake = fakePorts();
  const result = await mutateOccurrence(actor('GESTOR'), occurrenceId, 4,
    { kind: 'reclassify', priority: 'ALTA', reason: 'Risco confirmado pela equipe' }, fake.ports);
  expect(result).toEqual({ id: occurrenceId, version: 5, status: 'NOVA', priority: 'ALTA', groupId: groupA, deletedAt: false });
  expect(fake.saved[0]).toMatchObject({
    actorId: userId,
    eventKind: 'PRIORITY_RECLASSIFIED',
    reason: 'Risco confirmado pela equipe',
    changes: { priority: { from: 'NORMAL', to: 'ALTA' } },
  });
});

test('RF-011 Consulta/Operador cannot reclassify; short reason and unchanged priority do not mutate', async () => {
  for (const role of ['CONSULTA', 'OPERADOR'] as const) {
    const fake = fakePorts();
    await expect(mutateOccurrence(actor(role), occurrenceId, 4,
      { kind: 'reclassify', priority: 'ALTA', reason: 'Justificativa válida' }, fake.ports))
      .rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' });
    expect(fake.saved).toHaveLength(0);
  }

  const manager = fakePorts();
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 4,
    { kind: 'reclassify', priority: 'ALTA', reason: 'Curto' }, manager.ports))
    .rejects.toMatchObject({ status: 422, code: 'REASON_REQUIRED' });
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 4,
    { kind: 'reclassify', priority: 'NORMAL', reason: 'Mesmo valor sem mudança' }, manager.ports))
    .rejects.toMatchObject({ status: 422, code: 'NO_CHANGES' });
  expect(manager.saved).toHaveLength(0);
});

test('RNF-005 priority reclassification audit failure leaves priority and version unchanged', async () => {
  const fake = fakePorts(occurrence(), { auditFails: true });
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'reclassify', priority: 'ALTA', reason: 'Classificação revisada' }, fake.ports)).rejects.toThrow('audit insert failed');
  expect(fake.state.current.priority).toBe('NORMAL');
  expect(fake.state.current.version).toBe(4);
});

test('role capability guards reopen even if a transition rule accidentally grants the role', () => {
  expect(() => authorizeOccurrenceMutation(actor(), occurrence({ status: 'CANCELADA' }),
    { kind: 'transition', target: 'EM_TRIAGEM', reason: 'Justificativa válida' }, transition()))
    .toThrow(OccurrenceMutationError);
});

test('RF-012 only Admin logically deletes with a reason, version and audit metadata', async () => {
  const fake = fakePorts();
  await expect(mutateOccurrence(actor('GESTOR'), occurrenceId, 4,
    { kind: 'delete', reason: 'Ocorrência duplicada' }, fake.ports))
    .rejects.toMatchObject({ status: 403, code: 'ACCESS_DENIED' });
  expect(fake.saved).toHaveLength(0);

  const result = await mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'delete', reason: 'Ocorrência duplicada' }, fake.ports);
  expect(result).toMatchObject({ version: 5, deletedAt: true });
  expect(fake.saved[0]).toMatchObject({
    actorId: userId,
    eventKind: 'OCCURRENCE_DELETED',
    reason: 'Ocorrência duplicada',
    changes: { deletedAt: { from: null, to: 'deleted' } },
    deletedAt: true,
  });
});

test('RF-012 Admin restores only a deleted occurrence with a reason and new expected version', async () => {
  const deletedAt = new Date('2026-10-01T02:00:00.000Z');
  const fake = fakePorts(occurrence({ deletedAt, version: 6 }));
  const result = await mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 6,
    { kind: 'restore', reason: 'Removida por engano' }, fake.ports);
  expect(result).toMatchObject({ version: 7, deletedAt: false });
  expect(fake.saved[0]).toMatchObject({
    eventKind: 'OCCURRENCE_RESTORED',
    reason: 'Removida por engano',
    changes: { deletedAt: { from: deletedAt.toISOString(), to: null } },
    deletedAt: false,
  });
  expect(fake.state.current.deletedAt).toBeNull();
});

test('RF-012 missing reason, wrong state, and stale restore fail without partial changes', async () => {
  const active = fakePorts();
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'delete', reason: 'Curto' }, active.ports)).rejects.toMatchObject({ status: 422, code: 'REASON_REQUIRED' });
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'restore', reason: 'Restaurar registro ativo' }, active.ports)).rejects.toMatchObject({ status: 409, code: 'NOT_DELETED' });
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 3,
    { kind: 'delete', reason: 'Justificativa de exclusão' }, active.ports)).rejects.toMatchObject({ status: 409, code: 'VERSION_CONFLICT' });
  expect(active.state.current.deletedAt).toBeNull();
  expect(active.saved).toHaveLength(0);
});

test('RF-012 deleted occurrence rejects ordinary edit and transition until restore', async () => {
  const fake = fakePorts(occurrence({ deletedAt: new Date() }));
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'edit', type: 'Alterado' }, fake.ports)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'transition', target: 'EM_TRIAGEM' }, fake.ports)).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
  expect(fake.saved).toHaveLength(0);
});

test('RNF-005 soft-delete audit failure leaves record visible and version unchanged', async () => {
  const fake = fakePorts(occurrence(), { auditFails: true });
  await expect(mutateOccurrence(actor('ADMINISTRADOR'), occurrenceId, 4,
    { kind: 'delete', reason: 'Registro duplicado' }, fake.ports)).rejects.toThrow('audit insert failed');
  expect(fake.state.current.deletedAt).toBeNull();
  expect(fake.state.current.version).toBe(4);
});
