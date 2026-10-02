import { ShelterInputError } from './input';

function assertCoordinates(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new ShelterInputError();
  }
}

export function buildShelterDirections(lat: number, lng: number): { googleMaps: string; waze: string } {
  assertCoordinates(lat, lng);
  const destination = encodeURIComponent(`${lat},${lng}`);
  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
    waze: `https://waze.com/ul?ll=${destination}&navigate=yes`,
  };
}
