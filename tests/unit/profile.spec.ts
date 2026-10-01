import { expect, test } from '@playwright/test';
import { parseProfileUpdate, ProfileInputError } from '../../src/features/access/domain/profile';

test('RF-006 atualiza somente nome e telefone próprios e normaliza valores opcionais', () => {
  expect(parseProfileUpdate({ name: '  Ana Costa  ', phone: '  (51) 99999-0000  ' })).toEqual({
    name: 'Ana Costa',
    phone: '(51) 99999-0000',
  });
  expect(parseProfileUpdate({ name: 'Ana Costa', phone: '   ' })).toEqual({ name: 'Ana Costa', phone: null });
});

test('RF-006 rejeita campos protegidos, identificadores adulterados e dados fora dos limites', () => {
  for (const input of [
    { name: 'Ana', phone: '', role: 'ADMINISTRADOR' },
    { name: 'Ana', phone: '', userId: 'outro-usuario' },
    { name: '  ', phone: '' },
    { name: 'a'.repeat(121), phone: '' },
    { name: 'Ana', phone: '1'.repeat(41) },
    { name: 'Ana', phone: 51 },
  ]) {
    expect(() => parseProfileUpdate(input)).toThrow(ProfileInputError);
  }
});
