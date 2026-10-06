import { expect, test } from '@playwright/test';
import { ClimateEventInputError, parseClimateEventCommand } from '../../src/features/climate-events/domain/input';

const eventId = '90000000-0000-4000-8000-000000000035';

test('climate-event create trims the name and accepts inclusive calendar dates', () => {
  expect(parseClimateEventCommand({
    action: 'create', name: '  Cheia do Arroio  ', plannedStart: '2026-10-06', plannedEnd: '2026-10-06',
  })).toEqual({ action: 'create', name: 'Cheia do Arroio', plannedStart: '2026-10-06', plannedEnd: '2026-10-06' });
});

test('climate-event commands reject invalid dates, names, IDs, versions, and extra fields', () => {
  for (const command of [
    { action: 'create', name: ' ', plannedStart: '2026-10-06', plannedEnd: '2026-10-07' },
    { action: 'create', name: 'x'.repeat(121), plannedStart: '2026-10-06', plannedEnd: '2026-10-07' },
    { action: 'create', name: 'Evento', plannedStart: '2026-02-30', plannedEnd: '2026-03-01' },
    { action: 'create', name: 'Evento', plannedStart: '2026-10-08', plannedEnd: '2026-10-07' },
    { action: 'create', name: 'Evento', plannedStart: '2026-10-06T10:00:00Z', plannedEnd: '2026-10-07' },
    { action: 'start', id: 'not-a-uuid', expectedVersion: 1 },
    { action: 'close', id: eventId, expectedVersion: 0 },
    { action: 'start', id: eventId, expectedVersion: 1, municipalityId: 'other' },
  ]) expect(() => parseClimateEventCommand(command)).toThrow(ClimateEventInputError);
});

test('climate-event update requires a current version and valid complete date range', () => {
  expect(parseClimateEventCommand({
    action: 'update', id: eventId, expectedVersion: 4, name: 'Enchente', plannedStart: '2026-10-06', plannedEnd: '2026-10-08',
  })).toEqual({ action: 'update', id: eventId, expectedVersion: 4, name: 'Enchente', plannedStart: '2026-10-06', plannedEnd: '2026-10-08' });
  expect(() => parseClimateEventCommand({ action: 'update', id: eventId, expectedVersion: 4, name: 'Evento', plannedStart: '2026-10-09', plannedEnd: '2026-10-08' })).toThrow(ClimateEventInputError);
});

