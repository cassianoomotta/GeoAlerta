import type { Actor } from '@/features/access/contracts';
import { can } from '@/features/access/domain/permissions';
import type { Priority, Status } from '../contracts';
import {
  authorizeOccurrenceMutation,
  OccurrenceMutationError,
  type MutableOccurrence,
  type OccurrenceMutationCommand,
  type TransitionRule,
} from '../domain/mutation';

export type MutationResult = { id: string; version: number; status: Status; priority: Priority; groupId: string; deletedAt: boolean };

export type MutateOccurrencePorts = {
  getOccurrence(id: string): Promise<MutableOccurrence | null>;
  groupExistsInMunicipality(groupId: string, municipalityId: string): Promise<boolean>;
  getTransition(from: Status, to: Status): Promise<TransitionRule | undefined>;
  saveAtomically(command: {
    occurrence: MutableOccurrence;
    expectedVersion: number;
    groupId: string;
    status?: Status;
    priority?: Priority;
    deletedAt?: boolean;
    type?: string;
    description?: string;
    climateEventId?: string | null;
    eventKind: string;
    reason: string | null;
    changes: Record<string, { from: unknown; to: unknown }>;
    actorId: string;
  }): Promise<boolean>;
};

export async function mutateOccurrence(
  actor: Actor,
  id: string,
  expectedVersion: number,
  command: OccurrenceMutationCommand,
  ports: MutateOccurrencePorts,
): Promise<MutationResult> {
  const occurrence = await ports.getOccurrence(id);
  if (!occurrence) throw new OccurrenceMutationError(404, 'NOT_FOUND');
  const scope = { municipalityId: actor.municipalityId, groupId: occurrence.groupId };
  const requiredCapability = command.kind === 'delete' || command.kind === 'restore'
    ? 'administer'
    : command.kind === 'reclassify' || command.kind === 'climateEvent' || (command.kind === 'transition' &&
      (occurrence.status === 'RESOLVIDA' || occurrence.status === 'CANCELADA') && command.target === 'EM_TRIAGEM')
      ? 'reclassify'
      : 'operate';
  if (!can(actor, requiredCapability, scope)) throw new OccurrenceMutationError(403, 'ACCESS_DENIED');
  if (occurrence.version !== expectedVersion) throw new OccurrenceMutationError(409, 'VERSION_CONFLICT');

  if (command.kind === 'edit' && command.groupId !== undefined &&
      !(await ports.groupExistsInMunicipality(command.groupId, actor.municipalityId))) {
    throw new OccurrenceMutationError(403, 'ACCESS_DENIED');
  }

  const rule = command.kind === 'transition'
    ? await ports.getTransition(occurrence.status, command.target)
    : undefined;
  const decision = authorizeOccurrenceMutation(actor, occurrence, command, rule);
  const saved = await ports.saveAtomically({
    occurrence,
    expectedVersion,
    groupId: decision.groupId,
    ...(command.kind === 'transition' ? { status: command.target } : {}),
    ...(command.kind === 'reclassify' ? { priority: command.priority } : {}),
    ...(command.kind === 'delete' ? { deletedAt: true } : {}),
    ...(command.kind === 'restore' ? { deletedAt: false } : {}),
    ...(command.kind === 'edit' && command.type !== undefined ? { type: command.type } : {}),
    ...(command.kind === 'edit' && command.description !== undefined ? { description: command.description } : {}),
    ...(command.kind === 'climateEvent' ? { climateEventId: command.climateEventId } : {}),
    eventKind: decision.eventKind,
    reason: decision.reason,
    changes: decision.changes,
    actorId: actor.userId,
  });
  if (!saved) throw new OccurrenceMutationError(409, 'VERSION_CONFLICT');

  return {
    id,
    version: expectedVersion + 1,
    status: command.kind === 'transition' ? command.target : occurrence.status,
    priority: command.kind === 'reclassify' ? command.priority : occurrence.priority,
    groupId: decision.groupId,
    deletedAt: command.kind === 'delete' ? true : command.kind === 'restore' ? false : occurrence.deletedAt !== null,
  };
}
