import { test, expect } from '@playwright/test';
import { mapLegacyStatus, inspectLegacy } from '../../src/features/occurrences/legacy';

test('RNF-007 mapeia os quatro estados conhecidos', () => {
  expect(['Aberto', 'Em Atendimento', 'Resolvido', 'Recusado'].map(mapLegacyStatus)).toEqual(['NOVA', 'EM_ATENDIMENTO', 'RESOLVIDA', 'CANCELADA']);
});
test('RNF-007 estados desconhecidos bloqueiam saneamento sem modificar registros', () => {
  const rows = [{ id: 'synthetic', status: 'Novo', location: null }];
  const before = structuredClone(rows);
  expect(inspectLegacy(rows)).toEqual({ count: 1, unknownStatuses: [{ id: 'synthetic', status: 'Novo' }], missingLocations: ['synthetic'], canConstrain: false });
  expect(rows).toEqual(before);
  expect(() => mapLegacyStatus('Novo')).toThrow('saneamento');
  expect(() => mapLegacyStatus('toString')).toThrow('saneamento');
});
test('RNF-007 localização ausente permanece ausente, mesmo com estado conhecido', () => {
  const rows = [{ id: 'synthetic', status: 'Aberto', location: null }];
  expect(inspectLegacy(rows).canConstrain).toBe(false);
  expect(rows[0].location).toBeNull();
});
