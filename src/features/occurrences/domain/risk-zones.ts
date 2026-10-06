import { booleanValid, unkinkPolygon } from '@turf/turf';

export type ZoneGeometry = { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown[] };
export type RiskZoneInput = { name: string; type: 'INUNDACAO' | 'RISCO'; active: boolean; validFrom: string | null; validTo: string | null; geometry: ZoneGeometry };
export type RiskZoneCreate = RiskZoneInput & { reason: string; replacesZoneId?: string; duplicateOverrideReason?: string };
export type RiskZoneUpdate = RiskZoneInput & { zoneId: string; expectedVersion: number; reason: string; replacesZoneId?: string; duplicateOverrideReason?: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class RiskZoneInputError extends Error {
  constructor() { super('INVALID_RISK_ZONE'); }
}
export class RiskZoneVersionConflictError extends Error {
  constructor() { super('RISK_ZONE_VERSION_CONFLICT'); }
}

export class RiskZoneDuplicateError extends Error {
  constructor() { super('RISK_ZONE_DUPLICATE'); }
}

export function assertRiskZoneVersion(currentVersion: number, expectedVersion: number) {
  if (currentVersion !== expectedVersion) throw new RiskZoneVersionConflictError();
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new RiskZoneInputError();
  return value as Record<string, unknown>;
}

function position(value: unknown): value is [number, number] {
  return Array.isArray(value) && value.length === 2 && typeof value[0] === 'number' && Number.isFinite(value[0]) && value[0] >= -180 && value[0] <= 180 && typeof value[1] === 'number' && Number.isFinite(value[1]) && value[1] >= -90 && value[1] <= 90;
}

function validGeometry(value: unknown): value is ZoneGeometry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const geometry = value as Record<string, unknown>;
  if ((geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length) return false;
  try { if (JSON.stringify(geometry).length > 2_000_000) return false; } catch { return false; }
  const rings: unknown[] = geometry.type === 'Polygon'
    ? geometry.coordinates
    : geometry.coordinates.flatMap((polygon) => Array.isArray(polygon) ? polygon : []);
  if (!rings.length || rings.some((ring) => !Array.isArray(ring) || ring.length < 4 || !ring.every(position))) return false;
  if (rings.reduce<number>((count, ring) => count + (Array.isArray(ring) ? ring.length : 0), 0) > 30_000) return false;
  try {
    const components = geometry.type === 'Polygon' ? 1 : geometry.coordinates.length;
    return booleanValid(geometry as unknown as GeoJSON.Geometry) && unkinkPolygon(geometry as unknown as GeoJSON.Polygon | GeoJSON.MultiPolygon).features.length === components;
  } catch { return false; }
}

function validDate(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(value)) return undefined;
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10)) return undefined;
  return date.toISOString();
}

function parseFields(input: Record<string, unknown>): RiskZoneInput {
  if (typeof input.name !== 'string' || typeof input.type !== 'string' || typeof input.active !== 'boolean') throw new RiskZoneInputError();
  const name = input.name.trim();
  const validFrom = validDate(input.validFrom);
  const validTo = validDate(input.validTo);
  if (!name || name.length > 120 || !['INUNDACAO','RISCO'].includes(input.type) || validFrom === undefined || validTo === undefined || (validFrom && validTo && validTo <= validFrom) || !validGeometry(input.geometry)) throw new RiskZoneInputError();
  return { name, type: input.type as RiskZoneInput['type'], active: input.active, validFrom, validTo, geometry: input.geometry };
}

function requiredReason(value: unknown): string {
  if (typeof value !== 'string') throw new RiskZoneInputError();
  const reason = value.trim();
  if (!reason || reason.length > 500) throw new RiskZoneInputError();
  return reason;
}

function optionalZoneReference(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !uuid.test(value)) throw new RiskZoneInputError();
  return value;
}

function optionalOverrideReason(value: unknown): string | undefined {
  return value === undefined ? undefined : requiredReason(value);
}

export function parseCreateRiskZone(value: unknown): RiskZoneCreate {
  const input = record(value);
  if (Object.keys(input).some((key) => !['name','type','active','validFrom','validTo','geometry','reason','replacesZoneId','duplicateOverrideReason'].includes(key))) throw new RiskZoneInputError();
  const reason = requiredReason(input.reason);
  const replacesZoneId = optionalZoneReference(input.replacesZoneId);
  const duplicateOverrideReason = optionalOverrideReason(input.duplicateOverrideReason);
  const fields = parseFields({ ...input, active: false });
  return { ...fields, active: false, reason, replacesZoneId, duplicateOverrideReason };
}

export function parseUpdateRiskZone(value: unknown): RiskZoneUpdate {
  const input = record(value);
  if (Object.keys(input).some((key) => !['zoneId','expectedVersion','name','type','active','validFrom','validTo','geometry','reason','replacesZoneId','duplicateOverrideReason'].includes(key)) || typeof input.zoneId !== 'string' || !uuid.test(input.zoneId) || typeof input.expectedVersion !== 'number' || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new RiskZoneInputError();
  const fields = parseFields(input);
  if (!fields.validFrom) throw new RiskZoneInputError();
  const reason = requiredReason(input.reason);
  const replacesZoneId = optionalZoneReference(input.replacesZoneId);
  if (replacesZoneId === input.zoneId) throw new RiskZoneInputError();
  const duplicateOverrideReason = optionalOverrideReason(input.duplicateOverrideReason);
  return { ...fields, zoneId: input.zoneId, expectedVersion: input.expectedVersion, reason, replacesZoneId, duplicateOverrideReason };
}
