export type ProfileUpdate = { name: string; phone: string | null };

export class ProfileInputError extends Error {
  constructor() {
    super('INVALID_PROFILE_INPUT');
  }
}

export function parseProfileUpdate(value: unknown): ProfileUpdate {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ProfileInputError();
  const input = value as Record<string, unknown>;
  if (Object.keys(input).some((key) => key !== 'name' && key !== 'phone')) throw new ProfileInputError();

  if (typeof input.name !== 'string' || typeof input.phone !== 'string') throw new ProfileInputError();
  const name = input.name.trim();
  const phoneValue = input.phone.trim();
  if (!name || name.length > 120 || phoneValue.length > 40) throw new ProfileInputError();

  return { name, phone: phoneValue || null };
}
