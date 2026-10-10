import type { ShelterInput, ShelterStatus, ShelterType } from '../contracts';

export class ShelterInputError extends Error {
  constructor(message = 'Dados do abrigo inválidos.') {
    super(message);
    this.name = 'ShelterInputError';
  }
}

const types = new Set<ShelterType>(['humano', 'pet', 'misto']);
const statuses = new Set<ShelterStatus>(['Aberto', 'Lotado', 'Encerrado']);

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ShelterInputError();
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') throw new ShelterInputError();
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new ShelterInputError();
  return normalized;
}

function optionalText(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new ShelterInputError();
  const normalized = value.trim();
  if (normalized.length > maximum) throw new ShelterInputError();
  return normalized || null;
}

function coordinate(value: unknown, min: number, max: number): number | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new ShelterInputError();
  return value;
}

function coordinatePair(value: string | null): [number, number] | null {
  if (!value) return null;
  const parts = value.split(',');
  if (parts.length !== 2 || !parts[0].trim() || !parts[1].trim()) return null;
  const lat = Number(parts[0].trim());
  const lng = Number(parts[1].trim());
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

function coordinatesFromMapUrl(value: unknown): [number, number] | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw new ShelterInputError();

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ShelterInputError();
  }
  if (url.protocol !== 'https:') throw new ShelterInputError();

  const host = url.hostname.toLowerCase();
  let raw: string | null = null;
  if (host === 'maps.app.goo.gl' && url.pathname.length > 1) {
    // Short links do not expose coordinates without following a user-supplied URL.
    // Explicit validated coordinates remain the source of truth.
    return null;
  } else if (['waze.com', 'www.waze.com'].includes(host) && url.pathname === '/ul') {
    raw = url.searchParams.get('ll');
  } else if (['google.com', 'www.google.com', 'maps.google.com'].includes(host) && url.pathname.startsWith('/maps/')) {
    raw = url.searchParams.get('destination') ?? url.searchParams.get('query');
    if (!raw) {
      const match = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)(?:[,/]|$)/);
      if (match) raw = `${match[1]},${match[2]}`;
    }
  } else {
    throw new ShelterInputError();
  }

  const parsed = coordinatePair(raw);
  if (!parsed) throw new ShelterInputError();
  return parsed;
}

function nonNegativeInteger(value: unknown): number {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) throw new ShelterInputError();
  return value;
}

export function parseShelterInput(value: unknown): ShelterInput {
  const input = record(value);
  const name = requiredText(input.name, 160);
  const address = requiredText(input.address, 500);
  if (typeof input.type !== 'string' || !types.has(input.type as ShelterType)) throw new ShelterInputError();
  const type = input.type as ShelterType;
  const statusValue = input.status ?? 'Aberto';
  if (typeof statusValue !== 'string' || !statuses.has(statusValue as ShelterStatus)) throw new ShelterInputError();
  if (input.isActive !== undefined && typeof input.isActive !== 'boolean') throw new ShelterInputError();

  const lat = coordinate(input.lat, -90, 90);
  const lng = coordinate(input.lng, -180, 180);
  if ((lat === null) !== (lng === null)) throw new ShelterInputError();
  const fromLink = coordinatesFromMapUrl(input.mapUrl);
  if (lat === null || lng === null) {
    if (!fromLink) throw new ShelterInputError();
    return {
      name,
      type,
      address,
      lat: fromLink[0],
      lng: fromLink[1],
      capacity: nonNegativeInteger(input.capacity),
      occupied: nonNegativeInteger(input.occupied),
      phone: optionalText(input.phone, 40),
      manager: optionalText(input.manager, 160),
      status: statusValue as ShelterStatus,
      isActive: input.isActive as boolean | undefined ?? true,
    };
  }
  if (fromLink && (fromLink[0] !== lat || fromLink[1] !== lng)) throw new ShelterInputError();

  return {
    name,
    type,
    address,
    lat,
    lng,
    capacity: nonNegativeInteger(input.capacity),
    occupied: nonNegativeInteger(input.occupied),
    phone: optionalText(input.phone, 40),
    manager: optionalText(input.manager, 160),
    status: statusValue as ShelterStatus,
    isActive: input.isActive as boolean | undefined ?? true,
  };
}
