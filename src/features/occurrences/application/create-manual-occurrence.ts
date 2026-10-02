import type { Actor } from '../../access/contracts';
import { can } from '../../access/domain/permissions';
import type { PublicOccurrenceInput, OpenResult } from '../contracts';
import { PublicInputError, validateIdempotencyKey, validatePublicInput } from '../public-input';

export type CreateManualOccurrenceResult = { result: OpenResult; replay: boolean };
export type CreateManualOccurrencePorts = {
  groupBelongsToMunicipality(groupId: string, municipalityId: string): Promise<boolean>;
  classify(position: PublicOccurrenceInput['position']): Promise<{ priority: 'ALTA' | 'NORMAL'; zones: { zoneId: string; version: number }[] }>;
  createAtomically(command: {
    actorId: string;
    groupId: string;
    input: PublicOccurrenceInput;
    idempotencyKey: string;
    classify(): Promise<{ priority: 'ALTA' | 'NORMAL'; zones: { zoneId: string; version: number }[] }>;
  }): Promise<CreateManualOccurrenceResult>;
};

export class ManualOccurrenceAccessError extends Error {
  constructor(public status: 403, public code = 'ACCESS_DENIED') {
    super('Acesso não autorizado.');
  }
}

export class ManualOccurrenceConflictError extends Error {
  constructor(public status: 409, public code = 'IDEMPOTENCY_CONFLICT') {
    super('Esta chave já foi usada com outros dados.');
  }
}

function parseRequest(value: unknown): { groupId: string; input: PublicOccurrenceInput } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new PublicInputError();
  const body = value as Record<string, unknown>;
  const allowed = ['type', 'description', 'reporterName', 'reporterContact', 'position', 'groupId'];
  if (Object.keys(body).some((key) => !allowed.includes(key))) throw new PublicInputError();
  if (typeof body.groupId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.groupId)) {
    throw new PublicInputError();
  }
  const { groupId, ...occurrence } = body;
  return { groupId, input: validatePublicInput(occurrence, { allowCustomType: true }) };
}

export async function createManualOccurrence(
  actor: Actor,
  value: unknown,
  idempotencyKey: string | null,
  ports: CreateManualOccurrencePorts,
): Promise<CreateManualOccurrenceResult> {
  const request = parseRequest(value);
  const key = validateIdempotencyKey(idempotencyKey);
  if (!can(actor, 'operate', { municipalityId: actor.municipalityId, groupId: request.groupId })) {
    throw new ManualOccurrenceAccessError(403);
  }
  if (!await ports.groupBelongsToMunicipality(request.groupId, actor.municipalityId)) {
    throw new ManualOccurrenceAccessError(403);
  }
  return ports.createAtomically({
    actorId: actor.userId,
    groupId: request.groupId,
    input: request.input,
    idempotencyKey: key,
    classify: () => ports.classify(request.input.position),
  });
}
