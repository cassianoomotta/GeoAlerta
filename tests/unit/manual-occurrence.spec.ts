import { expect, test } from '@playwright/test';
import {
  createManualOccurrence,
  type CreateManualOccurrencePorts,
} from '../../src/features/occurrences/application/create-manual-occurrence';

const operator = {
  userId: '00000000-0000-4000-8000-000000000011',
  role: 'OPERADOR' as const,
  state: 'ATIVO' as const,
  municipalityId: 'sa_patrulha',
  groupIds: ['00000000-0000-4000-8000-000000000021'],
};
const groupId = '00000000-0000-4000-8000-000000000021';
const body = {
  type: 'alagamento',
  description: 'Água na rua',
  reporterName: 'Pessoa que ligou',
  reporterContact: '555-0100',
  groupId,
  position: { latitude: -29.9, longitude: -50.5, accuracy: 8 },
};
const key = 'manual-attempt-1';

function ports(overrides: Partial<CreateManualOccurrencePorts> = {}) {
  const calls = { groups: [] as unknown[], classifications: [] as unknown[], atomics: [] as unknown[] };
  const deps: CreateManualOccurrencePorts = {
    groupBelongsToMunicipality: async (id, municipalityId) => {
      calls.groups.push([id, municipalityId]);
      return true;
    },
    classify: async (position) => {
      calls.classifications.push(position);
      return { priority: 'ALTA', zones: [{ zoneId: '00000000-0000-4000-8000-000000000031', version: 2 }] };
    },
    createAtomically: async (command) => {
      calls.atomics.push(command);
      const classification = await command.classify();
      return { result: { id: '00000000-0000-4000-8000-000000000041', protocol: '1', status: 'NOVA', priority: classification.priority, version: 1 }, replay: false };
    },
    ...overrides,
  };
  return { deps, calls };
}

test('RF-002 registro manual sem coordenadas nativas falha antes de consultar ou gravar', async () => {
  const { deps, calls } = ports();
  const request = { ...body, position: undefined };

  await expect(createManualOccurrence(operator, request, key, deps)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  expect(calls.groups).toHaveLength(0);
  expect(calls.atomics).toHaveLength(0);
});

test('RF-011 operador não pode registrar em grupo fora do seu escopo', async () => {
  const { deps, calls } = ports();
  const request = { ...body, groupId: '00000000-0000-4000-8000-000000000099' };

  await expect(createManualOccurrence(operator, request, key, deps)).rejects.toMatchObject({ status: 403 });
  expect(calls.groups).toHaveLength(0);
  expect(calls.atomics).toHaveLength(0);
});

test('US-05 registra com triagem de zona e atribui a abertura ao operador autenticado', async () => {
  const { deps, calls } = ports();
  const result = await createManualOccurrence(operator, body, key, deps);

  expect(result).toEqual({ result: { id: '00000000-0000-4000-8000-000000000041', protocol: '1', status: 'NOVA', priority: 'ALTA', version: 1 }, replay: false });
  expect(calls.groups).toEqual([[groupId, 'sa_patrulha']]);
  expect(calls.classifications).toEqual([{ latitude: -29.9, longitude: -50.5, accuracy: 8 }]);
  expect(calls.atomics).toHaveLength(1);
  expect(calls.atomics[0]).toMatchObject({ actorId: operator.userId, groupId, idempotencyKey: key, input: expect.objectContaining({ type: 'alagamento' }) });
});

test('RF-015 falha ao persistir não confirma a ocorrência', async () => {
  const failure = new Error('database unavailable');
  const { deps } = ports({ createAtomically: async () => { throw failure; } });

  await expect(createManualOccurrence(operator, body, key, deps)).rejects.toBe(failure);
});

test('RF-002 prioridade fica normal quando a triagem não encontra zona ativa', async () => {
  const { deps } = ports({
    classify: async () => ({ priority: 'NORMAL', zones: [] }),
  });

  const result = await createManualOccurrence(operator, body, key, deps);
  expect(result.result.priority).toBe('NORMAL');
});
