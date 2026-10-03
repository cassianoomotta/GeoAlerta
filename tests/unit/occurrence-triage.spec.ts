import { expect, test } from '@playwright/test';

async function loadContracts() {
  try {
    return await import('../../src/features/occurrences/triage-contracts');
  } catch {
    return null;
  }
}

test('triagem conserva respostas desconhecidas e normaliza códigos estruturados', () => {
  return loadContracts().then((contracts) => {
    expect(contracts, 'contrato de triagem ainda não implementado').not.toBeNull();
    if (!contracts) return;
    expect(contracts.parseOccurrenceTriageInput({
    situation: 'EM_RISCO',
    registeringInstitutionCode: 'defesa_civil',
    neighborhoodCode: 'centro',
    localityCode: null,
    damageLocationCode: 'OUTROS',
    damageLocationDetail: '  margem do arroio  ',
    hasVictims: null,
    hasDisplaced: false,
    })).toEqual({
    situation: 'EM_RISCO',
    registeringInstitutionCode: 'defesa_civil',
    neighborhoodCode: 'centro',
    localityCode: null,
    damageLocationCode: 'OUTROS',
    damageLocationDetail: 'margem do arroio',
    hasVictims: null,
    hasDisplaced: false,
  });
    expect(contracts.parseOccurrenceTriageInput({
    situation: null,
    registeringInstitutionCode: null,
    neighborhoodCode: null,
    localityCode: null,
    damageLocationCode: null,
    damageLocationDetail: null,
    hasVictims: null,
    hasDisplaced: null,
    }).hasVictims).toBeNull();
  });
});

test('triagem rejeita valores fora dos catálogos e exige detalhe somente para OUTROS', async () => {
  const contracts = await loadContracts();
  expect(contracts, 'contrato de triagem ainda não implementado').not.toBeNull();
  if (!contracts) return;
  const valid = {
    situation: 'JA_OCORREU',
    registeringInstitutionCode: 'cidadao',
    neighborhoodCode: 'centro',
    localityCode: null,
    damageLocationCode: 'RESIDENCIA',
    damageLocationDetail: null,
    hasVictims: true,
    hasDisplaced: false,
  };
  for (const value of [
    { ...valid, situation: 'EM_ANDAMENTO' },
    { ...valid, hasVictims: 'NAO' },
    { ...valid, neighborhoodCode: 'Centro/../../private' },
    { ...valid, damageLocationCode: 'OUTROS' },
    { ...valid, damageLocationDetail: 'texto sem opção OUTROS' },
    { ...valid, unexpected: true },
  ]) expect(() => contracts.parseOccurrenceTriageInput(value)).toThrow(contracts.OccurrenceTriageInputError);
});

test('registro de atendimento valida os dados operacionais e rejeita autor/horário de auditoria do cliente', async () => {
  const contracts = await loadContracts();
  expect(contracts, 'contrato de atendimento ainda não implementado').not.toBeNull();
  if (!contracts) return;
  const valid = {
    agencyCode: 'defesa_civil',
    attendingPerson: '  Agente responsável  ',
    attendedAt: '2026-10-02T15:30:00.000Z',
    action: '  Realizado resgate preventivo  ',
    outcome: '  Família encaminhada  ',
    reinforcementRequested: true,
  };
  expect(contracts.parseOccurrenceServiceRecordInput(valid)).toEqual({
    ...valid,
    attendingPerson: 'Agente responsável',
    action: 'Realizado resgate preventivo',
    outcome: 'Família encaminhada',
  });
  for (const extra of [
    { actorId: '10000000-0000-4000-8000-000000000001' },
    { createdAt: '2026-10-02T15:30:00.000Z' },
    { userId: '10000000-0000-4000-8000-000000000001' },
  ]) expect(() => contracts.parseOccurrenceServiceRecordInput({ ...valid, ...extra })).toThrow(contracts.OccurrenceTriageInputError);
  expect(() => contracts.parseOccurrenceServiceRecordInput({ ...valid, attendedAt: 'ontem' })).toThrow(contracts.OccurrenceTriageInputError);
});
