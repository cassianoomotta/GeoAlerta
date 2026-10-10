import { expect, test } from '@playwright/test';
import { normalizeOccurrenceHistoryRow } from '@/features/occurrences/domain/history';

test('RF-010 normalizes the legacy history projection while optional detail migration is pending', () => {
  expect(normalizeOccurrenceHistoryRow({
    id: '91000000-0000-4000-8000-000000000001',
    kind: 'OCCURRENCE_EDITED',
    actorId: null,
    at: '2026-10-09T15:30:00.000Z',
  })).toEqual({
    id: '91000000-0000-4000-8000-000000000001',
    kind: 'OCCURRENCE_EDITED',
    actorId: null,
    actorName: null,
    at: '2026-10-09T15:30:00.000Z',
    changes: null,
  });
});

test('RF-010 keeps the enriched safe history fields when the migration is installed', () => {
  expect(normalizeOccurrenceHistoryRow({
    id: '91000000-0000-4000-8000-000000000002',
    kind: 'OCCURRENCE_EDITED',
    actorId: '20000000-0000-4000-8000-000000000001',
    actorName: 'Operador',
    at: '2026-10-09T15:30:00.000Z',
    changes: { type: { from: 'Alagamento', to: 'Enxurrada' } },
    reason: 'Justificativa privada',
    privateData: { reporterContact: 'Contato privado' },
  })).toEqual({
    id: '91000000-0000-4000-8000-000000000002',
    kind: 'OCCURRENCE_EDITED',
    actorId: '20000000-0000-4000-8000-000000000001',
    actorName: 'Operador',
    at: '2026-10-09T15:30:00.000Z',
    changes: { type: { from: 'Alagamento', to: 'Enxurrada' } },
  });
});
