import type { Actor, Role } from '@/features/access/contracts';
import { can } from '@/features/access/domain/permissions';
import type { Priority, Status } from '../contracts';

export type OccurrenceMutationCommand =
  | { kind: 'edit'; type?: string; description?: string; groupId?: string }
  | { kind: 'transition'; target: Status; reason?: string }

export type OccurrenceMutationPayload = {
  expectedVersion: number;
  command: OccurrenceMutationCommand;
};

export type MutableOccurrence = {
  id: string;
  type: string;
  description: string | null;
  status: Status;
  priority: Priority;
  groupId: string;
  version: number;
  deletedAt: Date | null;
};

export type TransitionRule = {
  enabled: boolean;
  roles: Role[];
  reasonRequired: boolean;
};

export class OccurrenceMutationError extends Error {
  constructor(public status: 403 | 404 | 409 | 422, public code: string) {
    super(code);
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const statuses: readonly Status[] = ['NOVA', 'EM_TRIAGEM', 'EM_ATENDIMENTO', 'RESOLVIDA', 'CANCELADA'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOccurrenceMutation(value: unknown): OccurrenceMutationPayload {
  if (!isRecord(value) || !Number.isSafeInteger(value.expectedVersion) || Number(value.expectedVersion) < 1 || !isRecord(value.command)) {
    throw new OccurrenceMutationError(422, 'INVALID_INPUT');
  }

  const command = value.command;
  if (command.kind === 'edit') {
    const edit: Extract<OccurrenceMutationCommand, { kind: 'edit' }> = { kind: 'edit' };
    if (typeof command.type === 'string') {
      const type = command.type.trim();
      if (!type || type.length > 80) throw new OccurrenceMutationError(422, 'INVALID_INPUT');
      edit.type = type;
    } else if (command.type !== undefined) {
      throw new OccurrenceMutationError(422, 'INVALID_INPUT');
    }
    if (typeof command.description === 'string') {
      const description = command.description.trim();
      if (description.length > 2000) throw new OccurrenceMutationError(422, 'INVALID_INPUT');
      edit.description = description;
    } else if (command.description !== undefined) {
      throw new OccurrenceMutationError(422, 'INVALID_INPUT');
    }
    if (typeof command.groupId === 'string' && uuidPattern.test(command.groupId)) {
      edit.groupId = command.groupId;
    } else if (command.groupId !== undefined) {
      throw new OccurrenceMutationError(422, 'INVALID_INPUT');
    }
    if (edit.type === undefined && edit.description === undefined && edit.groupId === undefined) {
      throw new OccurrenceMutationError(422, 'INVALID_INPUT');
    }
    return { expectedVersion: Number(value.expectedVersion), command: edit };
  }

  if (command.kind === 'transition' && typeof command.target === 'string' && statuses.includes(command.target as Status)) {
    const transition: Extract<OccurrenceMutationCommand, { kind: 'transition' }> = { kind: 'transition', target: command.target as Status };
    if (typeof command.reason === 'string') {
      const reason = command.reason.trim();
      if (reason.length > 500) throw new OccurrenceMutationError(422, 'INVALID_INPUT');
      transition.reason = reason;
    } else if (command.reason !== undefined) {
      throw new OccurrenceMutationError(422, 'INVALID_INPUT');
    }
    return { expectedVersion: Number(value.expectedVersion), command: transition };
  }

  throw new OccurrenceMutationError(422, 'INVALID_INPUT');
}

export function authorizeOccurrenceMutation(
  actor: Actor,
  occurrence: MutableOccurrence,
  command: OccurrenceMutationCommand,
  rule?: TransitionRule,
): { changes: Record<string, { from: unknown; to: unknown }>; eventKind: string; reason: string | null; groupId: string } {
  if (occurrence.deletedAt) throw new OccurrenceMutationError(404, 'NOT_FOUND');
  if (!can(actor, 'operate', { municipalityId: actor.municipalityId, groupId: occurrence.groupId })) {
    throw new OccurrenceMutationError(403, 'ACCESS_DENIED');
  }

  if (command.kind === 'edit') {
    const changes: Record<string, { from: unknown; to: unknown }> = {};
    if (command.type !== undefined && command.type !== occurrence.type) changes.type = { from: occurrence.type, to: command.type };
    if (command.description !== undefined && command.description !== occurrence.description) changes.description = { from: occurrence.description, to: command.description };
    if (command.groupId !== undefined && command.groupId !== occurrence.groupId) {
      if (!can(actor, 'operate', { municipalityId: actor.municipalityId, groupId: command.groupId })) {
        throw new OccurrenceMutationError(403, 'ACCESS_DENIED');
      }
      changes.groupId = { from: occurrence.groupId, to: command.groupId };
    }
    if (!Object.keys(changes).length) throw new OccurrenceMutationError(422, 'NO_CHANGES');
    return { changes, eventKind: 'OCCURRENCE_EDITED', reason: null, groupId: command.groupId ?? occurrence.groupId };
  }

  if ((occurrence.status === 'RESOLVIDA' || occurrence.status === 'CANCELADA') && command.target === 'EM_TRIAGEM') throw new OccurrenceMutationError(403, 'ACCESS_DENIED');
  if (!rule?.enabled || !rule.roles.includes(actor.role)) throw new OccurrenceMutationError(422, 'TRANSITION_NOT_ALLOWED');
  if (rule.reasonRequired && (!command.reason || command.reason.trim().length < 10)) {
    throw new OccurrenceMutationError(422, 'REASON_REQUIRED');
  }
  if (command.target === occurrence.status) throw new OccurrenceMutationError(422, 'NO_CHANGES');
  return {
    changes: { status: { from: occurrence.status, to: command.target } },
    eventKind: 'STATUS_TRANSITIONED',
    reason: command.reason?.trim() || null,
    groupId: occurrence.groupId,
  };
}
