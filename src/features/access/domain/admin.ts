import type { AccessState, Role } from '../contracts';

const roles: readonly Role[] = ['CONSULTA', 'VOLUNTARIO', 'OPERADOR', 'GESTOR', 'ADMINISTRADOR'];
const states: readonly AccessState[] = ['PENDENTE', 'ATIVO', 'SUSPENSO', 'DESATIVADO'];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class AdminInputError extends Error {
  constructor() { super('INVALID_ADMIN_INPUT'); }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new AdminInputError();
  return value as Record<string, unknown>;
}

function exactKeys(input: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(input).some((key) => !keys.includes(key))) throw new AdminInputError();
}

function groupIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100 || value.some((id) => typeof id !== 'string' || !uuid.test(id))) throw new AdminInputError();
  const unique = [...new Set(value as string[])];
  if (unique.length !== value.length) throw new AdminInputError();
  return unique;
}

export type CreateManagedUser = { email: string; name: string; phone: string | null; role: Role; groupIds: string[] };
export function parseCreateManagedUser(value: unknown): CreateManagedUser {
  const input = record(value);
  exactKeys(input, ['email', 'name', 'phone', 'role', 'groupIds']);
  if (typeof input.email !== 'string' || typeof input.name !== 'string' || typeof input.phone !== 'string' || typeof input.role !== 'string') throw new AdminInputError();
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120 || phone.length > 40 || !roles.includes(input.role as Role)) throw new AdminInputError();
  return { email, name, phone: phone || null, role: input.role as Role, groupIds: groupIds(input.groupIds) };
}

export function parseCreateGroupUser(value: unknown): CreateManagedUser {
  const input = record(value);
  exactKeys(input, ['email', 'name', 'phone', 'role', 'groupId']);
  if (typeof input.groupId !== 'string' || !uuid.test(input.groupId)) throw new AdminInputError();
  return parseCreateManagedUser({ email: input.email, name: input.name, phone: input.phone, role: input.role, groupIds: [input.groupId] });
}

export type UpdateManagedUser = { userId: string; name: string; phone: string | null; role: Role; state: AccessState; groupIds: string[] };
export function parseUpdateManagedUser(value: unknown): UpdateManagedUser {
  const input = record(value);
  exactKeys(input, ['userId', 'name', 'phone', 'role', 'state', 'groupIds']);
  if (typeof input.userId !== 'string' || !uuid.test(input.userId) || typeof input.name !== 'string' || (input.phone !== null && typeof input.phone !== 'string') || typeof input.role !== 'string' || !roles.includes(input.role as Role) || typeof input.state !== 'string' || !states.includes(input.state as AccessState)) throw new AdminInputError();
  const name = input.name.trim();
  const phone = typeof input.phone === 'string' ? input.phone.trim() : null;
  if (!name || name.length > 120 || (phone !== null && phone.length > 40)) throw new AdminInputError();
  return { userId: input.userId, name, phone: phone || null, role: input.role as Role, state: input.state as AccessState, groupIds: groupIds(input.groupIds) };
}

export type ManagedGroupInput = { id?: string; name: string; isDefault: boolean };
export function parseManagedGroup(value: unknown): ManagedGroupInput {
  const input = record(value);
  exactKeys(input, ['id', 'name', 'isDefault']);
  if (typeof input.name !== 'string' || typeof input.isDefault !== 'boolean' || (input.id !== undefined && (typeof input.id !== 'string' || !uuid.test(input.id)))) throw new AdminInputError();
  const name = input.name.trim();
  if (!name || name.length > 100) throw new AdminInputError();
  return { ...(input.id === undefined ? {} : { id: input.id as string }), name, isDefault: input.isDefault };
}

export function requireAdmin(actor: { role: Role; state: AccessState; municipalityId: string }) {
  if (actor.role !== 'ADMINISTRADOR' || actor.state !== 'ATIVO' || actor.municipalityId !== 'sa_patrulha') throw new AdminInputError();
}
