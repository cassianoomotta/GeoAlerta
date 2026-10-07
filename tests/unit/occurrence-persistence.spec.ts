import { expect, test } from '@playwright/test';
import type { Prisma } from '../../prisma/generated/client/client';
import { classifyOccurrence, persistOccurrence } from '../../src/server/occurrences/persist';
import type { PublicOccurrenceInput } from '../../src/features/occurrences/contracts';
import type { BattalionOccurrenceInput } from '../../src/features/occurrences/battalion-input';

const input: PublicOccurrenceInput = {
  type: 'alagamento',
  description: 'Água na via',
  reporterName: 'Pessoa',
  reporterContact: '555-0100',
  address: 'Rua das Flores, 123',
  position: { latitude: -29.5, longitude: -50.5, accuracy: 8 },
};

test('US-05 classificador comum deriva prioridade e versões das zonas retornadas', async () => {
  let values: unknown[] = [];
  let query = '';
  const tx = {
    $queryRaw: async (parts: TemplateStringsArray, ...parameters: unknown[]) => {
      query = Array.from(parts).join('?');
      values = parameters;
      return [{ zone_id: '00000000-0000-4000-8000-000000000002', version: 2 }];
    },
  } as unknown as Prisma.TransactionClient;

  await expect(classifyOccurrence(tx, input.position)).resolves.toEqual({
    priority: 'ALTA',
    zones: [{ zoneId: '00000000-0000-4000-8000-000000000002', version: 2 }],
  });
  expect(values).toEqual([-50.5, -29.5]);
  expect(query).toContain('geoalerta_private.effective_risk_zone_version');
  expect(query).toContain('z.active');
  expect(query).toContain('z.valid_from<=transaction_timestamp()');
  expect(query).toContain('z.valid_to>transaction_timestamp()');
  expect(query).toContain('ST_Intersects');
});

test('US-05 persistência comum inclui protocolo, trilha com ator, alerta e idempotência numa transação', async () => {
  const statements: { sql: string; values: unknown[] }[] = [];
  const tx = {
    $queryRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ sql: Array.from(parts).join('?'), values });
      return [{ protocol: '1' }];
    },
    $executeRaw: async (parts: TemplateStringsArray, ...values: unknown[]) => {
      statements.push({ sql: Array.from(parts).join('?'), values });
      return 1;
    },
  } as unknown as Prisma.TransactionClient;

  const result = await persistOccurrence(tx, {
    input: { ...input, needsMedicalSupport: false },
    groupId: '00000000-0000-4000-8000-000000000001',
    idempotencyKey: 'manual:user:request',
    requestHash: 'hash',
    classification: { priority: 'ALTA', zones: [{ zoneId: '00000000-0000-4000-8000-000000000002', version: 2 }] },
    actorId: '00000000-0000-4000-8000-000000000003',
    registrationChannel: 'MANUAL',
    locationSource: 'GPS_NATIVO',
  });

  expect(result).toMatchObject({ protocol: '1', status: 'NOVA', priority: 'ALTA', version: 1 });
  expect(statements).toHaveLength(7);
  expect(statements.map(({ sql }) => sql)).toEqual(expect.arrayContaining([
    expect.stringContaining('INSERT INTO public.occurrences'),
    expect.stringContaining('INSERT INTO public.occurrence_events'),
    expect.stringContaining('INSERT INTO public.audit_events'),
    expect.stringContaining('INSERT INTO public.occurrence_alerts'),
    expect.stringContaining('INSERT INTO public.idempotency_keys'),
  ]));
  const occurrence = statements.find(({ sql }) => sql.includes('INSERT INTO public.occurrences'))!;
  expect(occurrence.sql).toContain('RETURNING protocol');
  expect(occurrence.sql).not.toMatch(/INSERT INTO public\.occurrences\s*\([^)]*protocol/);
  expect(occurrence.sql).toContain('address');
  expect(occurrence.values).toContain('Rua das Flores, 123');
  expect(occurrence.sql).toContain('needs_medical_support');
  expect(occurrence.sql).toContain('registration_channel');
  expect(occurrence.sql).toContain('location_source');
  expect(occurrence.values).toContain(false);
  expect(occurrence.values).toContain('MANUAL');
  expect(occurrence.values).toContain('GPS_NATIVO');
  const event = statements.find(({ sql }) => sql.includes('occurrence_events'))!;
  const audit = statements.find(({ sql }) => sql.includes('audit_events'))!;
  expect(event.values).toContain('00000000-0000-4000-8000-000000000003');
  expect(audit.values).toContain('00000000-0000-4000-8000-000000000003');

  statements.length = 0;
  await persistOccurrence(tx, {
    input,
    groupId: '00000000-0000-4000-8000-000000000001',
    idempotencyKey: 'manual:user:legacy-request',
    requestHash: 'legacy-hash',
    classification: { priority: 'NORMAL', zones: [] },
    actorId: null,
    registrationChannel: 'PUBLICO',
    locationSource: 'GPS_NATIVO',
  });
  const legacyOccurrence = statements.find(({ sql }) => sql.includes('INSERT INTO public.occurrences'))!;
  expect(legacyOccurrence.sql).toContain('needs_medical_support');
  expect(legacyOccurrence.values).toContain(null);

  statements.length = 0;
  const battalionInput: BattalionOccurrenceInput = {
    type: 'Alagamento / Inundação', address: 'Rua das Flores', description: 'Água na via',
    needsMedicalSupport: true, reporterName: null, reporterContact: null,
    position: { latitude: -29.5, longitude: -50.5, accuracy: null },
  };
  await persistOccurrence(tx, {
    input: battalionInput,
    groupId: '00000000-0000-4000-8000-000000000001',
    idempotencyKey: 'battalion:user:request',
    requestHash: 'battalion-hash',
    classification: { priority: 'NORMAL', zones: [] },
    actorId: '00000000-0000-4000-8000-000000000003',
    registrationChannel: 'BATALHAO',
    locationSource: 'MAPA',
  });
  const battalionOccurrence = statements.find(({ sql }) => sql.includes('INSERT INTO public.occurrences'))!;
  expect(battalionOccurrence.values).toContain('BATALHAO');
  expect(battalionOccurrence.values).toContain('MAPA');
  expect(battalionOccurrence.values).toContain(null);
});
