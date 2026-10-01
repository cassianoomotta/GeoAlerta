import { expect, test } from '@playwright/test';
import { assertRiskZoneVersion, parseCreateRiskZone, parseUpdateRiskZone, RiskZoneInputError, RiskZoneVersionConflictError } from '../../src/features/occurrences/domain/risk-zones';

const polygon = { type: 'Polygon', coordinates: [[[-50.6,-29.9],[-50.5,-29.9],[-50.5,-29.8],[-50.6,-29.8],[-50.6,-29.9]]] };
const valid = { name: 'Mancha principal', type: 'INUNDACAO', active: true, validFrom: '2026-09-01', validTo: null, geometry: polygon };

test('RF-003 aceita Polygon/MultiPolygon válidos, vigência e versionamento otimista', () => {
  expect(parseCreateRiskZone(valid)).toMatchObject({ name: 'Mancha principal', type: 'INUNDACAO', active: true, validFrom: '2026-09-01T00:00:00.000Z', validTo: null, geometry: polygon });
  expect(parseCreateRiskZone({ ...valid, type: 'RISCO', geometry: { type: 'MultiPolygon', coordinates: [[polygon.coordinates[0]]] } }).geometry.type).toBe('MultiPolygon');
  expect(parseUpdateRiskZone({ ...valid, zoneId: '11111111-1111-4111-8111-111111111111', expectedVersion: 4 })).toMatchObject({ expectedVersion: 4, zoneId: '11111111-1111-4111-8111-111111111111' });
});

test('RF-003 recusa GeoJSON inválido, geometria inválida e coordenadas fora de WGS84', () => {
  const bowTie = { type: 'Polygon', coordinates: [[[-50.6,-29.9],[-50.5,-29.8],[-50.5,-29.9],[-50.6,-29.8],[-50.6,-29.9]]] };
  for (const geometry of [bowTie, { type: 'Polygon', coordinates: [[[-250,-29],[-249,-29],[-249,-28],[-250,-28],[-250,-29]]] }, { type: 'Polygon', coordinates: [[[-50,-29,4],[-49,-29,4],[-49,-28,4],[-50,-28,4],[-50,-29,4]]] }]) {
    expect(() => parseCreateRiskZone({ ...valid, geometry })).toThrow(RiskZoneInputError);
  }
  expect(() => parseCreateRiskZone({ ...valid, geometry: { type: 'Point', coordinates: [0,0] } })).toThrow(RiskZoneInputError);
});

test('RF-003 recusa tipo, vigência invertida, nome excessivo e metadados não previstos', () => {
  for (const input of [
    { ...valid, type: 'FLOOD' },
    { ...valid, validFrom: '2026-10-10', validTo: '2026-10-01' },
    { ...valid, name: 'x'.repeat(121) },
    { ...valid, municipalityId: 'outro' },
  ]) expect(() => parseCreateRiskZone(input)).toThrow(RiskZoneInputError);
  expect(() => parseUpdateRiskZone({ ...valid, zoneId: '11111111-1111-4111-8111-111111111111', expectedVersion: 0 })).toThrow(RiskZoneInputError);
});

test('RF-003 versão esperada evita sobrescrever uma atualização mais recente', () => {
  expect(() => assertRiskZoneVersion(4, 4)).not.toThrow();
  expect(() => assertRiskZoneVersion(5, 4)).toThrow(RiskZoneVersionConflictError);
});
