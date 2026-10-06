import { expect, test } from '@playwright/test';
import { parseAuditCursor } from '../../src/features/audit/application/pagination';

test('accepts a complete audit cursor and normalizes its timestamp', () => {
  expect(parseAuditCursor('2026-10-06T12:00:00-03:00', '11111111-1111-4111-8111-111111111111')).toEqual({
    at: '2026-10-06T15:00:00.000Z',
    id: '11111111-1111-4111-8111-111111111111',
  });
});

test('rejects partial or malformed audit cursors', () => {
  expect(() => parseAuditCursor('2026-10-06T12:00:00Z', undefined)).toThrow('INVALID_AUDIT_CURSOR');
  expect(() => parseAuditCursor('not-a-date', '11111111-1111-4111-8111-111111111111')).toThrow('INVALID_AUDIT_CURSOR');
  expect(() => parseAuditCursor('2026-10-06T12:00:00Z', 'not-a-uuid')).toThrow('INVALID_AUDIT_CURSOR');
});
