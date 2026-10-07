import { expect, test } from '@playwright/test';
import {
  BattalionConfigurationError,
  BattalionOccurrenceAccessError,
  createBattalionOccurrence,
  type CreateBattalionOccurrencePorts,
} from '../../src/features/occurrences/application/create-battalion-occurrence';

const defaultGroupId = '00000000-0000-4000-8000-000000000021';
const otherGroupId = '00000000-0000-4000-8000-000000000022';
const operator = {
  userId: '00000000-0000-4000-8000-000000000011', role: 'OPERADOR' as const, state: 'ATIVO' as const,
  municipalityId: 'sa_patrulha', groupIds: [defaultGroupId],
};
const valid = {
  type: 'Alagamento / Inundação', address: 'Rua das Flores, 123', description: 'Água na via',
  needsMedicalSupport: true, position: { latitude: -29.5, longitude: -50.5, confirmed: true },
};

function ports(overrides: Partial<CreateBattalionOccurrencePorts> = {}) {
  const calls = { types: 0, groups: [] as string[], classifications: [] as unknown[], atomics: [] as unknown[] };
  const deps: CreateBattalionOccurrencePorts = {
    activeTypes: async () => { calls.types++; return ['Alagamento / Inundação']; },
    defaultGroups: async (municipalityId) => { calls.groups.push(municipalityId); return [{ id: defaultGroupId, municipalityId }]; },
    classify: async (position) => { calls.classifications.push(position); return { priority: 'ALTA', zones: [{ zoneId: '00000000-0000-4000-8000-000000000031', version: 2 }] }; },
    createAtomically: async (command) => {
      calls.atomics.push(command);
      const classification = await command.classify();
      return { result: { id: '00000000-0000-4000-8000-000000000041', protocol: '37', status: 'NOVA', priority: classification.priority, version: 1 }, replay: false };
    },
    ...overrides,
  };
  return { deps, calls };
}

test('encaminha posição confirmada e grupo padrão ao caminho transacional sem expor grupo ao caller', async () => {
  const { deps, calls } = ports();
  const result = await createBattalionOccurrence(operator, valid, 'battalion-1', deps);
  expect(result.result).toMatchObject({ protocol: '37', priority: 'ALTA', status: 'NOVA' });
  expect(calls.groups).toEqual(['sa_patrulha']);
  expect(calls.classifications).toEqual([{ latitude: -29.5, longitude: -50.5, accuracy: null }]);
  expect(calls.atomics[0]).toMatchObject({ actorId: operator.userId, groupId: defaultGroupId, idempotencyKey: 'battalion-1', input: { needsMedicalSupport: true, reporterName: null, reporterContact: null } });
});

test('operador sem vínculo ao grupo padrão é recusado sem encaminhamento alternativo', async () => {
  const { deps, calls } = ports({ defaultGroups: async () => [{ id: otherGroupId, municipalityId: 'sa_patrulha' }] });
  await expect(createBattalionOccurrence(operator, valid, 'battalion-1', deps)).rejects.toBeInstanceOf(BattalionOccurrenceAccessError);
  expect(calls.atomics).toHaveLength(0);
});

test('administrador ativo pode operar o grupo padrão do próprio município', async () => {
  const admin = { ...operator, role: 'ADMINISTRADOR' as const, groupIds: [] };
  const { deps, calls } = ports();
  await createBattalionOccurrence(admin, valid, 'battalion-2', deps);
  expect(calls.atomics).toHaveLength(1);
});

test('CONSULTA e perfil suspenso não registram', async () => {
  for (const actor of [
    { ...operator, role: 'CONSULTA' as const },
    { ...operator, state: 'SUSPENSO' as const },
  ]) {
    const { deps, calls } = ports();
    await expect(createBattalionOccurrence(actor, valid, 'battalion-3', deps)).rejects.toBeInstanceOf(BattalionOccurrenceAccessError);
    expect(calls.atomics).toHaveLength(0);
  }
});

test('grupo padrão de outro município é tratado como erro de configuração', async () => {
  const { deps, calls } = ports({ defaultGroups: async () => [{ id: defaultGroupId, municipalityId: 'outro_municipio' }] });
  await expect(createBattalionOccurrence(operator, valid, 'battalion-6', deps)).rejects.toBeInstanceOf(BattalionConfigurationError);
  expect(calls.atomics).toHaveLength(0);
});

test('tipo desativado e configuração sem grupo padrão falham sem gravação', async () => {
  const inactive = ports({ activeTypes: async () => ['Buracos'] });
  await expect(createBattalionOccurrence(operator, valid, 'battalion-4', inactive.deps)).rejects.toMatchObject({ code: 'INVALID_INPUT' });
  const missing = ports({ defaultGroups: async () => [] });
  await expect(createBattalionOccurrence(operator, valid, 'battalion-5', missing.deps)).rejects.toBeInstanceOf(BattalionConfigurationError);
  expect(inactive.calls.atomics).toHaveLength(0);
  expect(missing.calls.atomics).toHaveLength(0);
});
