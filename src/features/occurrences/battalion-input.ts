export type BattalionOccurrencePosition = { latitude: number; longitude: number; accuracy: null };
export type BattalionOccurrenceInput = {
  type: string;
  address: string;
  description: string;
  needsMedicalSupport: boolean;
  reporterName: string | null;
  reporterContact: string | null;
  position: BattalionOccurrencePosition;
};

export class BattalionInputError extends Error {
  readonly code = 'INVALID_INPUT';
  constructor() { super('Verifique os campos, confirme o ponto no mapa e tente novamente.'); }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BattalionInputError();
  return value as Record<string, unknown>;
}

function requiredText(value: unknown, maximum: number): string {
  if (typeof value !== 'string') throw new BattalionInputError();
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) throw new BattalionInputError();
  return normalized;
}

function optionalText(value: unknown, maximum: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new BattalionInputError();
  const normalized = value.trim();
  if (normalized.length > maximum) throw new BattalionInputError();
  return normalized || null;
}

function coordinate(value: unknown, minimum: number, maximum: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > maximum) throw new BattalionInputError();
  return value;
}

/** Dedicated contract: public GPS, reporter identity and contact remain required in their own parser. */
export function validateBattalionInput(value: unknown, activeTypes: readonly string[]): BattalionOccurrenceInput {
  const input = object(value);
  if (Object.keys(input).some(key => !['type', 'address', 'description', 'needsMedicalSupport', 'reporterName', 'reporterContact', 'position'].includes(key))) {
    throw new BattalionInputError();
  }
  const type = requiredText(input.type, 80);
  if (!activeTypes.includes(type)) throw new BattalionInputError();
  if (typeof input.needsMedicalSupport !== 'boolean') throw new BattalionInputError();
  const position = object(input.position);
  if (Object.keys(position).some(key => !['latitude', 'longitude', 'confirmed'].includes(key)) || position.confirmed !== true) {
    throw new BattalionInputError();
  }
  return {
    type,
    address: requiredText(input.address, 300),
    description: requiredText(input.description, 500),
    needsMedicalSupport: input.needsMedicalSupport,
    reporterName: optionalText(input.reporterName, 120),
    reporterContact: optionalText(input.reporterContact, 40),
    position: {
      latitude: coordinate(position.latitude, -90, 90),
      longitude: coordinate(position.longitude, -180, 180),
      accuracy: null,
    },
  };
}
