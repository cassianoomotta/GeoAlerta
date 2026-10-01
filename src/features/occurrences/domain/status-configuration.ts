import { STATUSES, type Status } from '../contracts';

export type StatusPresentationInput = { code: Status; label: string; displayOrder: number };
export type TransitionInput = { fromStatus: Status; toStatus: Status; enabled: boolean };
export class StatusConfigurationInputError extends Error {
  constructor() { super('INVALID_STATUS_CONFIGURATION'); }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new StatusConfigurationInputError();
  return value as Record<string, unknown>;
}

export function parseStatusPresentations(value: unknown): StatusPresentationInput[] {
  if (!Array.isArray(value) || value.length !== STATUSES.length) throw new StatusConfigurationInputError();
  const result = value.map((item) => {
    const input = record(item);
    if (Object.keys(input).some((key) => !['code','label','displayOrder'].includes(key)) || typeof input.code !== 'string' || !STATUSES.includes(input.code as Status) || typeof input.label !== 'string' || typeof input.displayOrder !== 'number' || !Number.isInteger(input.displayOrder)) throw new StatusConfigurationInputError();
    const label = input.label.trim();
    if (!label || label.length > 40 || input.displayOrder < 1 || input.displayOrder > STATUSES.length) throw new StatusConfigurationInputError();
    return { code: input.code as Status, label, displayOrder: input.displayOrder };
  });
  if (new Set(result.map((item) => item.code)).size !== STATUSES.length || new Set(result.map((item) => item.displayOrder)).size !== STATUSES.length) throw new StatusConfigurationInputError();
  return result;
}

export function parseTransitionInput(value: unknown): TransitionInput {
  const input = record(value);
  if (Object.keys(input).some((key) => !['fromStatus','toStatus','enabled'].includes(key)) || typeof input.fromStatus !== 'string' || !STATUSES.includes(input.fromStatus as Status) || typeof input.toStatus !== 'string' || !STATUSES.includes(input.toStatus as Status) || typeof input.enabled !== 'boolean' || input.fromStatus === input.toStatus) throw new StatusConfigurationInputError();
  return { fromStatus: input.fromStatus as Status, toStatus: input.toStatus as Status, enabled: input.enabled };
}
