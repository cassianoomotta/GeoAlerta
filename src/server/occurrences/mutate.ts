import 'server-only';
import type { Prisma } from '../../../prisma/generated/client/client';
import type { Actor, Role } from '@/features/access/contracts';
import type { Priority, Status } from '@/features/occurrences/contracts';
import { mutateOccurrence, type MutateOccurrencePorts } from '@/features/occurrences/application/mutate-occurrence';
import type { OccurrenceMutationPayload } from '@/features/occurrences/domain/mutation';

const roles: readonly Role[] = ['CONSULTA', 'OPERADOR', 'GESTOR', 'ADMINISTRADOR'];

function parseRoles(value: unknown): Role[] {
  if (!Array.isArray(value)) return [];
  return value.filter((role): role is Role => typeof role === 'string' && roles.includes(role as Role));
}

export async function mutateOccurrenceInTransaction(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  payload: OccurrenceMutationPayload,
) {
  const ports: MutateOccurrencePorts = {
    getOccurrence: async (occurrenceId) => {
      const rows = await tx.$queryRaw<{
        id: string; type: string; description: string | null; status: Status; priority: Priority;
        group_id: string; version: number; deleted_at: Date | null;
      }[]>`
        SELECT id::text AS id,type,description,status,priority,group_id::text AS group_id,version,deleted_at
        FROM public.occurrences WHERE id=${occurrenceId}::uuid
      `;
      const row = rows[0];
      return row ? {
        id: row.id,
        type: row.type,
        description: row.description,
        status: row.status,
        priority: row.priority,
        groupId: row.group_id,
        version: row.version,
        deletedAt: row.deleted_at,
      } : null;
    },
    groupExistsInMunicipality: async (groupId, municipalityId) => {
      const rows = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM public.groups
        WHERE id=${groupId}::uuid AND municipality_id=${municipalityId}
      `;
      return rows.length === 1;
    },
    getTransition: async (from, to) => {
      const rows = await tx.$queryRaw<{ enabled: boolean; roles: unknown; reason_required: boolean }[]>`
        SELECT enabled,roles,reason_required FROM public.status_transitions
        WHERE from_status=${from} AND to_status=${to}
      `;
      const row = rows[0];
      return row ? { enabled: row.enabled, roles: parseRoles(row.roles), reasonRequired: row.reason_required } : undefined;
    },
    saveAtomically: async (mutation) => {
      if (mutation.status !== undefined) {
        await tx.$queryRaw`SELECT set_config('core.mutation_reason', ${mutation.reason ?? ''}, true)`;
        const updated = await tx.$executeRaw`
          UPDATE public.occurrences SET status=${mutation.status},version=version+1,updated_at=transaction_timestamp()
          WHERE id=${mutation.occurrence.id}::uuid AND version=${mutation.expectedVersion} AND deleted_at IS NULL
        `;
        return updated === 1;
      }
      const updated = await tx.$executeRaw`
        UPDATE public.occurrences SET type=COALESCE(${mutation.type ?? null},type),
          description=COALESCE(${mutation.description ?? null},description),group_id=${mutation.groupId}::uuid,
          version=version+1,updated_at=transaction_timestamp()
        WHERE id=${mutation.occurrence.id}::uuid AND version=${mutation.expectedVersion} AND deleted_at IS NULL
      `;
      if (updated !== 1) return false;
      await tx.$executeRaw`
        INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id,reason,changes)
        VALUES(${mutation.occurrence.id}::uuid,${mutation.eventKind},${mutation.actorId}::uuid,${mutation.reason},${JSON.stringify(mutation.changes)}::jsonb)
      `;
      await tx.$executeRaw`
        INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes)
        VALUES(${mutation.actorId}::uuid,${mutation.occurrence.id}::uuid,${mutation.eventKind},${mutation.reason},${JSON.stringify(mutation.changes)}::jsonb)
      `;
      return true;
    },
  };

  return mutateOccurrence(actor, id, payload.expectedVersion, payload.command, ports);
}
