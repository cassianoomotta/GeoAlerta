import { expect, test } from '@playwright/test';
import { configureStatusPresentations, configureStatusTransition } from '../../src/features/occurrences/application/configure-status';
import { parseStatusPresentations, parseTransitionInput, StatusConfigurationInputError } from '../../src/features/occurrences/domain/status-configuration';

const validPresentations = [
  { code: 'NOVA', label: 'Recebida', displayOrder: 1 },
  { code: 'EM_TRIAGEM', label: 'Triagem', displayOrder: 2 },
  { code: 'EM_ATENDIMENTO', label: 'Atendimento', displayOrder: 3 },
  { code: 'RESOLVIDA', label: 'Resolvida', displayOrder: 4 },
  { code: 'CANCELADA', label: 'Cancelada', displayOrder: 5 },
];

test('RF-014 aceita alterar somente rótulo e ordem mantendo todos os códigos internos', () => {
  expect(parseStatusPresentations(validPresentations).map((item) => item.code)).toEqual(['NOVA','EM_TRIAGEM','EM_ATENDIMENTO','RESOLVIDA','CANCELADA']);
  expect(parseStatusPresentations([{ ...validPresentations[1], displayOrder: 1 }, { ...validPresentations[0], displayOrder: 2 }, ...validPresentations.slice(2)]).slice(0,2).map((item) => item.code)).toEqual(['EM_TRIAGEM','NOVA']);
});

test('RF-014 recusa código alterado/ausente, rótulo vazio e ordens duplicadas', () => {
  for (const invalid of [
    validPresentations.slice(1),
    [{ ...validPresentations[0], code: 'NOVO' }, ...validPresentations.slice(1)],
    [{ ...validPresentations[0], label: '  ' }, ...validPresentations.slice(1)],
    [{ ...validPresentations[0], displayOrder: 2 }, ...validPresentations.slice(1)],
  ]) expect(() => parseStatusPresentations(invalid)).toThrow(StatusConfigurationInputError);
});

test('RF-014 somente habilita/desabilita uma transição existente sem alterar papéis', () => {
  expect(parseTransitionInput({ fromStatus: 'EM_TRIAGEM', toStatus: 'EM_ATENDIMENTO', enabled: false })).toEqual({ fromStatus: 'EM_TRIAGEM', toStatus: 'EM_ATENDIMENTO', enabled: false });
  expect(() => parseTransitionInput({ fromStatus: 'RESOLVIDA', toStatus: 'EM_TRIAGEM', enabled: true, roles: ['OPERADOR'] })).toThrow(StatusConfigurationInputError);
  expect(() => parseTransitionInput({ fromStatus: 'EM_TRIAGEM', toStatus: 'EM_TRIAGEM', enabled: true })).toThrow(StatusConfigurationInputError);
});

test('RF-014 mudanças válidas gravam auditoria e falha de auditoria reverte a configuração', async () => {
  let stored = validPresentations.map((item) => ({ ...item }));
  const audited: string[] = [];
  async function atomicSave(items: typeof stored, auditKind: string, failAudit = false) {
    const previous = stored;
    try {
      stored = items.map((item) => ({ ...item }));
      if (failAudit) throw new Error('AUDIT_UNAVAILABLE');
      audited.push(auditKind);
    } catch (error) { stored = previous; throw error; }
  }
  await configureStatusPresentations(validPresentations.map((item) => item.code === 'NOVA' ? { ...item, label: 'Recebida' } : item), (items) => atomicSave(items, 'ADMIN_STATUS_PRESENTATIONS_UPDATED'));
  expect(stored[0].label).toBe('Recebida');
  await expect(configureStatusTransition({ fromStatus: 'EM_TRIAGEM', toStatus: 'EM_ATENDIMENTO', enabled: false }, async () => atomicSave(stored, 'ADMIN_STATUS_TRANSITION_UPDATED', true))).rejects.toThrow('AUDIT_UNAVAILABLE');
  expect(stored[0].label).toBe('Recebida');
  expect(audited).toEqual(['ADMIN_STATUS_PRESENTATIONS_UPDATED']);
});
