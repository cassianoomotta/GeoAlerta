import type { GeoPosition } from '../contracts';

export type GeolocationPort = Pick<Geolocation, 'getCurrentPosition'>;
export class NativePositionError extends Error {
  constructor(public code: 'PERMISSION_DENIED' | 'UNAVAILABLE' | 'TIMEOUT') {
    super(code);
  }
}

export function readNativePosition(geolocation: GeolocationPort | undefined): Promise<GeoPosition> {
  if (!geolocation) return Promise.reject(new NativePositionError('UNAVAILABLE'));
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      }),
      (error) => reject(new NativePositionError(
        error.code === 1 ? 'PERMISSION_DENIED' : error.code === 3 ? 'TIMEOUT' : 'UNAVAILABLE',
      )),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15_000 },
    );
  });
}
