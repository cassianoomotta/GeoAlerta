import { expect, test } from '@playwright/test';
import { readNativePosition, NativePositionError, type GeolocationPort } from '../../src/features/occurrences/ui/manual-position';

function geolocation(succeed: boolean): GeolocationPort {
  return {
    getCurrentPosition(success, failure) {
      if (succeed) {
        if (!success) throw new Error('Expected a success callback');
        success({ coords: { latitude: -29.9, longitude: -50.5, accuracy: 8 } } as GeolocationPosition);
      } else {
        if (!failure) throw new Error('Expected an error callback');
        failure({ code: 1 } as GeolocationPositionError);
      }
    },
  };
}

test('RF-002 captura latitude longitude e precisão retornadas pelo GPS nativo', async () => {
  const position = await readNativePosition(geolocation(true));
  expect(position).toEqual({ latitude: -29.9, longitude: -50.5, accuracy: 8 });
});

test('RF-002 GPS negado retorna erro recuperável e não inventa uma posição', async () => {
  await expect(readNativePosition(geolocation(false))).rejects.toMatchObject({ code: 'PERMISSION_DENIED' } satisfies Partial<NativePositionError>);
});

test('RF-002 navegador sem geolocalização orienta o usuário a habilitar localização', async () => {
  await expect(readNativePosition(undefined)).rejects.toMatchObject({ code: 'UNAVAILABLE' } satisfies Partial<NativePositionError>);
});
