import { expect, test } from '@playwright/test';
import { groupPickerValue } from '../../src/features/access/domain/group-picker';

test('grupo picker mostra placeholder, nome único ou quantidade sem alterar seleção múltipla', () => {
  expect(groupPickerValue([])).toBe('Selecione grupos');
  expect(groupPickerValue(['Triagem inicial'])).toBe('Triagem inicial');
  expect(groupPickerValue(['Triagem inicial', 'Jipeiros'])).toBe('2 grupos selecionados');
});
