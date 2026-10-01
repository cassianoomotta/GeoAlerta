import { expect, test } from '@playwright/test';
import type { Actor, Role } from '@/features/access/contracts';
import type { Status } from '@/features/occurrences/contracts';
import {
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
