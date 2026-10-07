import { expect, test } from '@playwright/test';
import { BATTALION_MAP_DEFAULT_CENTER, BATTALION_MAP_DEFAULT_ZOOM } from '../../src/features/occurrences/domain/battalion-map';

test('Task 37 abre o mapa centrado em Santo Antônio da Patrulha em escala municipal', () => {
  expect(BATTALION_MAP_DEFAULT_CENTER).toEqual([-29.8252, -50.5186]);
  expect(BATTALION_MAP_DEFAULT_ZOOM).toBe(13);
});
