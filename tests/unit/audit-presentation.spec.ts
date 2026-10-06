import { expect, test } from '@playwright/test';
import { auditActionLabel, auditActionTarget, formatAuditActor } from '../../src/features/audit/application/presentation';

test('classifies known audited entity types without exposing change payloads', () => {
  expect(auditActionTarget('ADMIN_USER_ACCESS_UPDATED')).toBe('Usuário');
  expect(auditActionTarget('STATUS_TRANSITIONED')).toBe('Ocorrência');
  expect(auditActionTarget('ADMIN_RISK_ZONE_UPDATED')).toBe('Zona de risco');
  expect(auditActionTarget('LEGACY_RISK_ZONE_IMPORTED')).toBe('Zona de risco');
  expect(auditActionTarget('UNKNOWN_EVENT')).toBe('Registro');
});

test('formats actor identifiers for display and labels system events', () => {
  expect(formatAuditActor('11111111-1111-4111-8111-111111111111')).toBe('11111111…1111');
  expect(formatAuditActor(null)).toBe('Sistema');
});

test('uses Portuguese labels for known audit actions and preserves unknown codes', () => {
  expect(auditActionLabel('STATUS_TRANSITIONED')).toBe('Status da ocorrência alterado');
  expect(auditActionLabel('ADMIN_USER_PROVISIONED')).toBe('Usuário provisionado');
  expect(auditActionLabel('ADMIN_RISK_ZONE_VERSION_CREATED')).toBe('Versão da zona de risco criada');
  expect(auditActionLabel('ADMIN_SHELTER_ACTIVATED')).toBe('Abrigo ativado');
  expect(auditActionLabel('UNKNOWN_EVENT')).toBe('UNKNOWN_EVENT');
});
