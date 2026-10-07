import { expect, test } from '@playwright/test';
import { BattalionInputError, validateBattalionInput } from '../../src/features/occurrences/battalion-input';

const allowedTypes = ['Alagamento / Inundação', 'Buracos'];
const valid = {
  type: 'Alagamento / Inundação',
  address: 'Rua das Flores, 123',
  description: 'Água acumulada na via',
  needsMedicalSupport: false,
  position: { latitude: -29.5, longitude: -50.5, confirmed: true },
};

test('registro do batalhão normaliza opcionais sem inventar contato e persiste precisão desconhecida', () => {
  expect(validateBattalionInput(valid, allowedTypes)).toEqual({
    type: 'Alagamento / Inundação',
    address: 'Rua das Flores, 123',
    description: 'Água acumulada na via',
    needsMedicalSupport: false,
    reporterName: null,
    reporterContact: null,
    position: { latitude: -29.5, longitude: -50.5, accuracy: null },
  });
});

test('contato e nome são opcionais e independentes; branco vira null e os limites são aceitos', () => {
  expect(validateBattalionInput({ ...valid, reporterName: '  Ana  ' }, allowedTypes).reporterName).toBe('Ana');
  expect(validateBattalionInput({ ...valid, reporterContact: '  ' }, allowedTypes).reporterContact).toBeNull();
  expect(validateBattalionInput({ ...valid, reporterName: 'n'.repeat(120), reporterContact: 'c'.repeat(40), address: 'a'.repeat(300), description: 'd'.repeat(500) }, allowedTypes)).toMatchObject({
    reporterName: 'n'.repeat(120), reporterContact: 'c'.repeat(40), address: 'a'.repeat(300), description: 'd'.repeat(500),
  });
});

test('exige tipo ativo, referência, descrição e resposta médica explícita', () => {
  for (const input of [
    { ...valid, type: 'Granizo' },
    { ...valid, address: '  ' },
    { ...valid, description: '  ' },
    { ...valid, needsMedicalSupport: undefined },
    { ...valid, needsMedicalSupport: 'não' },
  ]) {
    expect(() => validateBattalionInput(input, allowedTypes)).toThrow(BattalionInputError);
  }
});

test('recusa textos acima dos limites e campos privados inválidos', () => {
  for (const input of [
    { ...valid, address: 'a'.repeat(301) },
    { ...valid, description: 'd'.repeat(501) },
    { ...valid, reporterName: 'n'.repeat(121) },
    { ...valid, reporterContact: 'c'.repeat(41) },
    { ...valid, reporterName: 12 },
    { ...valid, reporterContact: false },
  ]) {
    expect(() => validateBattalionInput(input, allowedTypes)).toThrow(BattalionInputError);
  }
});

test('exige confirmação atual do ponto e coordenadas finitas dentro dos limites', () => {
  for (const position of [
    { latitude: -29.5, longitude: -50.5, confirmed: false },
    { latitude: 91, longitude: -50.5, confirmed: true },
    { latitude: -29.5, longitude: 181, confirmed: true },
    { latitude: Number.NaN, longitude: -50.5, confirmed: true },
    { latitude: -29.5, longitude: Number.POSITIVE_INFINITY, confirmed: true },
    { latitude: -29.5, longitude: -50.5, accuracy: 1, confirmed: true },
  ]) {
    expect(() => validateBattalionInput({ ...valid, position }, allowedTypes)).toThrow(BattalionInputError);
  }
});

test('recusa grupo, evento, município, origem, prioridade e status escolhidos pelo cliente', () => {
  for (const field of ['groupId', 'climateEventId', 'municipalityId', 'origin', 'priority', 'status']) {
    expect(() => validateBattalionInput({ ...valid, [field]: 'forjado' }, allowedTypes)).toThrow(BattalionInputError);
  }
});
