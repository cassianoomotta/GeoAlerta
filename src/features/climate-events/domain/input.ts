const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export type ClimateEventCommand =
  | { action: 'create'; name: string; plannedStart: string; plannedEnd: string }
  | { action: 'update'; id: string; expectedVersion: number; name: string; plannedStart: string; plannedEnd: string }
  | { action: 'start' | 'close'; id: string; expectedVersion: number };

export class ClimateEventInputError extends Error {
  constructor(public code = 'INVALID_CLIMATE_EVENT') {
    super(code);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function exactKeys(input: Record<string, unknown>, allowed: readonly string[]) {
  if (Object.keys(input).some((key) => !allowed.includes(key))) throw new ClimateEventInputError();
}

function eventName(value: unknown): string {
  if (typeof value !== 'string') throw new ClimateEventInputError();
  const name = value.trim();
  if (name.length < 1 || name.length > 120) throw new ClimateEventInputError();
  return name;
}

function calendarDate(value: unknown): string {
  if (typeof value !== 'string' || !datePattern.test(value)) throw new ClimateEventInputError();
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new ClimateEventInputError();
  return value;
}

function dateRange(startValue: unknown, endValue: unknown) {
  const plannedStart = calendarDate(startValue);
  const plannedEnd = calendarDate(endValue);
  if (plannedEnd < plannedStart) throw new ClimateEventInputError();
  return { plannedStart, plannedEnd };
}

function id(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw new ClimateEventInputError();
  return value.toLowerCase();
}

function version(value: unknown): number {
  if (!Number.isSafeInteger(value) || Number(value) < 1) throw new ClimateEventInputError();
  return Number(value);
}

export function parseClimateEventCommand(value: unknown): ClimateEventCommand {
  if (!isRecord(value) || typeof value.action !== 'string') throw new ClimateEventInputError();
  if (value.action === 'create') {
    exactKeys(value, ['action', 'name', 'plannedStart', 'plannedEnd']);
    return { action: 'create', name: eventName(value.name), ...dateRange(value.plannedStart, value.plannedEnd) };
  }
  if (value.action === 'update') {
    exactKeys(value, ['action', 'id', 'expectedVersion', 'name', 'plannedStart', 'plannedEnd']);
    return {
      action: 'update', id: id(value.id), expectedVersion: version(value.expectedVersion),
      name: eventName(value.name), ...dateRange(value.plannedStart, value.plannedEnd),
    };
  }
  if (value.action === 'start' || value.action === 'close') {
    exactKeys(value, ['action', 'id', 'expectedVersion']);
    return { action: value.action, id: id(value.id), expectedVersion: version(value.expectedVersion) };
  }
  throw new ClimateEventInputError();
}

