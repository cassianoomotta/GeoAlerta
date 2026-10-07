import type { Actor } from '../../access/contracts';
import { can } from '../../access/domain/permissions';
import type { OpenResult, Priority } from '../contracts';
import { BattalionInputError, validateBattalionInput, type BattalionOccurrenceInput } from '../battalion-input';

export type BattalionClassification = { priority: Priority; zones: { zoneId: string; version: number }[] };
export type CreateBattalionOccurrencePorts = {
  activeTypes(municipalityId: string): Promise<readonly string[]>;
  defaultGroups(municipalityId: string): Promise<{ id: string; municipalityId: string }[]>;
  classify(position: BattalionOccurrenceInput['position']): Promise<BattalionClassification>;
  createAtomically(command: {
    actorId: string;
    groupId: string;
    input: BattalionOccurrenceInput;
    idempotencyKey: string;
    classify(): Promise<BattalionClassification>;
  }): Promise<{ result: OpenResult; replay: boolean }>;
};

export class BattalionOccurrenceAccessError extends Error {
  readonly status = 403;
  readonly code = 'ACCESS_DENIED';
  constructor() { super('Acesso não autorizado ao grupo padrão.'); }
}

export class BattalionConfigurationError extends Error {
  readonly status = 503;
  readonly code = 'DEFAULT_GROUP_UNAVAILABLE';
  constructor() { super('Grupo padrão indisponível.'); }
}

export class BattalionOccurrenceConflictError extends Error {
  readonly status = 409;
  readonly code = 'IDEMPOTENCY_CONFLICT';
  constructor() { super('Esta chave já foi usada com outros dados.'); }
}

function validateKey(value: string | null): string {
  if (!value || value.length > 200 || !/^[A-Za-z0-9_.:-]+$/.test(value)) throw new BattalionInputError();
  return value;
}

export async function createBattalionOccurrence(
  actor: Actor,
  value: unknown,
  idempotencyKey: string | null,
  ports: CreateBattalionOccurrencePorts,
): Promise<{ result: OpenResult; replay: boolean }> {
  if (!['OPERADOR', 'GESTOR', 'ADMINISTRADOR'].includes(actor.role) || actor.state !== 'ATIVO' || !actor.municipalityId) {
    throw new BattalionOccurrenceAccessError();
  }
  const key = validateKey(idempotencyKey);
  const input = validateBattalionInput(value, await ports.activeTypes(actor.municipalityId));
  const groups = await ports.defaultGroups(actor.municipalityId);
  if (groups.length !== 1) throw new BattalionConfigurationError();
  if (groups[0].municipalityId !== actor.municipalityId) throw new BattalionConfigurationError();
  const groupId = groups[0].id;
  if (!can(actor, 'operate', { municipalityId: actor.municipalityId, groupId })) throw new BattalionOccurrenceAccessError();
  return ports.createAtomically({
    actorId: actor.userId,
    groupId,
    input,
    idempotencyKey: key,
    classify: () => ports.classify(input.position),
  });
}
