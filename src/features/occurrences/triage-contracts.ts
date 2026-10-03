export const OCCURRENCE_SITUATIONS = ['EM_RISCO', 'JA_OCORREU'] as const;
export type OccurrenceSituation = typeof OCCURRENCE_SITUATIONS[number];

export type OccurrenceTriageInput = {
  situation: OccurrenceSituation | null;
  registeringInstitutionCode: string | null;
  neighborhoodCode: string | null;
  localityCode: string | null;
  damageLocationCode: string | null;
  damageLocationDetail: string | null;
  hasVictims: boolean | null;
  hasDisplaced: boolean | null;
};

export type OccurrenceServiceRecordInput = {
  agencyCode: string;
  attendingPerson: string;
  attendedAt: string;
  action: string;
  outcome: string | null;
  reinforcementRequested: boolean;
};

export class OccurrenceTriageInputError extends Error {
  constructor() {
    super('INVALID_OCCURRENCE_TRIAGE_INPUT');
    this.name = 'OccurrenceTriageInputError';
  }
}

const triageKeys = [
  'situation',
  'registeringInstitutionCode',
  'neighborhoodCode',
  'localityCode',
  'damageLocationCode',
  'damageLocationDetail',
  'hasVictims',
  'hasDisplaced',
] as const;

const serviceRecordKeys = [
  'agencyCode',
  'attendingPerson',
  'attendedAt',
  'action',
  'outcome',
  'reinforcementRequested',
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function nullableCode(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !/^[A-Z0-9]+(?:_[A-Z0-9]+)*$|^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(value) || value.length > 80) {
    throw new OccurrenceTriageInputError();
  }
  return value;
}

function nullableText(value: unknown, maximum: number): string | null {
  if (value === null) return null;
  if (typeof value !== 'string') throw new OccurrenceTriageInputError();
  const normalized = value.trim();
  if (normalized.length > maximum) throw new OccurrenceTriageInputError();
  return normalized || null;
}

function requiredText(value: unknown, maximum: number): string {
  const normalized = nullableText(value, maximum);
  if (!normalized) throw new OccurrenceTriageInputError();
  return normalized;
}

export function parseOccurrenceTriageInput(value: unknown): OccurrenceTriageInput {
  if (!isRecord(value) || !hasExactKeys(value, triageKeys)) throw new OccurrenceTriageInputError();

  const situation = value.situation;
  if (situation !== null && !OCCURRENCE_SITUATIONS.includes(situation as OccurrenceSituation)) {
    throw new OccurrenceTriageInputError();
  }

  const damageLocationCode = nullableCode(value.damageLocationCode);
  const damageLocationDetail = nullableText(value.damageLocationDetail, 500);
  if ((damageLocationCode === 'OUTROS') !== Boolean(damageLocationDetail)) throw new OccurrenceTriageInputError();

  for (const answer of [value.hasVictims, value.hasDisplaced]) {
    if (answer !== null && typeof answer !== 'boolean') throw new OccurrenceTriageInputError();
  }

  return {
    situation: situation as OccurrenceSituation | null,
    registeringInstitutionCode: nullableCode(value.registeringInstitutionCode),
    neighborhoodCode: nullableCode(value.neighborhoodCode),
    localityCode: nullableCode(value.localityCode),
    damageLocationCode,
    damageLocationDetail,
    hasVictims: value.hasVictims as boolean | null,
    hasDisplaced: value.hasDisplaced as boolean | null,
  };
}

export function parseOccurrenceServiceRecordInput(value: unknown): OccurrenceServiceRecordInput {
  if (!isRecord(value) || !hasExactKeys(value, serviceRecordKeys)) throw new OccurrenceTriageInputError();

  const agencyCode = nullableCode(value.agencyCode);
  const attendingPerson = requiredText(value.attendingPerson, 160);
  const action = requiredText(value.action, 4_000);
  const outcome = nullableText(value.outcome, 4_000);
  const attendedAt = value.attendedAt;
  if (!agencyCode || typeof attendedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(attendedAt)) {
    throw new OccurrenceTriageInputError();
  }
  const parsedDate = new Date(attendedAt);
  if (!Number.isFinite(parsedDate.getTime()) || parsedDate.toISOString() !== attendedAt) throw new OccurrenceTriageInputError();
  if (typeof value.reinforcementRequested !== 'boolean') throw new OccurrenceTriageInputError();

  return { agencyCode, attendingPerson, attendedAt, action, outcome, reinforcementRequested: value.reinforcementRequested };
}
