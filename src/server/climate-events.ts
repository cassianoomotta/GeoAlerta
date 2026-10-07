import 'server-only';
import { Prisma, type Prisma as PrismaTypes } from '../../prisma/generated/client/client';
import type { Actor } from '@/features/access/contracts';
import type { ClimateEvent } from '@/features/climate-events/contracts';
import type { ClimateEventCommand } from '@/features/climate-events/domain/input';
import { AccessError, requireCapability } from './access/context';

type EventRow = {
  id: string; municipality_id: string; name: string; planned_start: string; planned_end: string;
  state: ClimateEvent['state']; started_at: Date | null; ended_at: Date | null;
  created_at: Date; updated_at: Date; version: number;
};
export class ClimateEventConflict extends Error {
  constructor(public code: string, public message: string, public pending?: { id: string; protocol: string; status: string }[], public outOfScope = false) { super(code); }
}
function present(row: EventRow): ClimateEvent {
  return { id: row.id, municipalityId: row.municipality_id, name: row.name,
    plannedStart: row.planned_start, plannedEnd: row.planned_end, state: row.state,
    startedAt: row.started_at?.toISOString() ?? null, endedAt: row.ended_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(), updatedAt: row.updated_at.toISOString(), version: row.version };
}
const projection = `id::text,municipality_id,name,planned_start::text,planned_end::text,state,started_at,ended_at,created_at,updated_at,version`;

export async function listClimateEvents(tx: PrismaTypes.TransactionClient, actor: Actor): Promise<ClimateEvent[]> {
  requireCapability(actor, 'read');
  const rows = await tx.$queryRaw<(EventRow & { occurrences: { id: string; protocol: string; status: string }[] | null })[]>`
    SELECT e.id::text,e.municipality_id,e.name,e.planned_start::text,e.planned_end::text,e.state,e.started_at,e.ended_at,e.created_at,e.updated_at,e.version,
      jsonb_agg(jsonb_build_object('id',o.id::text,'protocol',o.protocol,'status',o.status) ORDER BY o.protocol)
        FILTER (WHERE o.id IS NOT NULL) AS occurrences
    FROM public.climate_events e LEFT JOIN public.occurrences o ON o.climate_event_id=e.id AND o.deleted_at IS NULL
    WHERE e.municipality_id=${actor.municipalityId}
    GROUP BY e.id ORDER BY CASE e.state WHEN 'EM_ANDAMENTO' THEN 0 WHEN 'PLANEJADO' THEN 1 ELSE 2 END,e.planned_start DESC,e.id
  `;
  return rows.map((row) => ({ ...present(row), occurrences: row.occurrences ?? [] }));
}

async function getEvent(tx: PrismaTypes.TransactionClient, actor: Actor, id: string): Promise<EventRow> {
  const rows = await tx.$queryRaw<EventRow[]>`SELECT ${Prisma.raw(projection)} FROM public.climate_events WHERE id=${id}::uuid AND municipality_id=${actor.municipalityId}`;
  if (!rows[0]) throw new AccessError(404, 'NOT_FOUND');
  return rows[0];
}

export async function manageClimateEvent(tx: PrismaTypes.TransactionClient, actor: Actor, command: ClimateEventCommand): Promise<ClimateEvent> {
  requireCapability(actor, 'reclassify');
  if (command.action === 'create') {
    const rows = await tx.$queryRaw<EventRow[]>`INSERT INTO public.climate_events(municipality_id,name,planned_start,planned_end) VALUES(${actor.municipalityId},${command.name},${command.plannedStart}::date,${command.plannedEnd}::date) RETURNING ${Prisma.raw(projection)}`;
    return present(rows[0]);
  }
  if (command.action === 'close') {
    await getEvent(tx, actor, command.id);
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`climate-event:${actor.municipalityId}`},0))`;
    const visible = actor.role === 'ADMINISTRADOR'
      ? await tx.$queryRaw<{ id: string; protocol: string; status: string }[]>`SELECT id::text,protocol,status FROM public.occurrences WHERE climate_event_id=${command.id}::uuid AND status NOT IN ('RESOLVIDA','CANCELADA') ORDER BY protocol`
      : await tx.$queryRaw<{ id: string; protocol: string; status: string }[]>`SELECT id::text,protocol,status FROM public.occurrences WHERE climate_event_id=${command.id}::uuid AND group_id=ANY(${actor.groupIds}::uuid[]) AND status NOT IN ('RESOLVIDA','CANCELADA') ORDER BY protocol`;
    const hidden = actor.role === 'ADMINISTRADOR' ? false : (await tx.$queryRaw<{ blocked: boolean }[]>`SELECT EXISTS(SELECT 1 FROM public.occurrences WHERE climate_event_id=${command.id}::uuid AND NOT(group_id=ANY(${actor.groupIds}::uuid[])) AND status NOT IN ('RESOLVIDA','CANCELADA')) AS blocked`)[0]?.blocked ?? false;
    if (visible.length || hidden) throw new ClimateEventConflict('CLIMATE_EVENT_BLOCKED', hidden ? 'Há pendências fora do seu escopo; solicite atuação de um responsável autorizado.' : 'Resolva ou cancele as ocorrências vinculadas antes de encerrar o evento.', visible, hidden);
    const rows = await tx.$queryRaw<EventRow[]>`UPDATE public.climate_events SET state='ENCERRADO',version=version+1 WHERE id=${command.id}::uuid AND municipality_id=${actor.municipalityId} AND state='EM_ANDAMENTO' AND version=${command.expectedVersion} RETURNING ${Prisma.raw(projection)}`;
    if (rows[0]) return present(rows[0]);
    const current = await getEvent(tx, actor, command.id);
    throw new ClimateEventConflict(current.version !== command.expectedVersion ? 'STALE_VERSION' : 'INVALID_TRANSITION', 'O evento mudou ou não pode ser encerrado no estado atual.');
  }
  if (command.action === 'start') {
    const current = await getEvent(tx, actor, command.id);
    if (current.version !== command.expectedVersion) throw new ClimateEventConflict('STALE_VERSION', 'O evento foi atualizado. Recarregue antes de tentar novamente.');
    if (current.state !== 'PLANEJADO') throw new ClimateEventConflict('INVALID_TRANSITION', 'Somente eventos planejados podem ser iniciados.');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`climate-event:${actor.municipalityId}`},0))`;
    const rows = await tx.$queryRaw<EventRow[]>`UPDATE public.climate_events SET state='EM_ANDAMENTO',version=version+1 WHERE id=${command.id}::uuid AND municipality_id=${actor.municipalityId} AND state='PLANEJADO' AND version=${command.expectedVersion} RETURNING ${Prisma.raw(projection)}`;
    if (rows[0]) return present(rows[0]);
    throw new ClimateEventConflict('CLIMATE_EVENT_ALREADY_ACTIVE', 'Já existe um evento em andamento neste município ou o evento foi atualizado.');
  }
  if (command.action !== 'update') throw new ClimateEventConflict('INVALID_TRANSITION', 'Comando de evento climático inválido.');
  const current = await getEvent(tx, actor, command.id);
  if (current.version !== command.expectedVersion) throw new ClimateEventConflict('STALE_VERSION', 'O evento foi atualizado. Recarregue antes de tentar novamente.');
  if (current.state === 'ENCERRADO') throw new ClimateEventConflict('INVALID_TRANSITION', 'Eventos encerrados não podem ser alterados.');
  const rows = await tx.$queryRaw<EventRow[]>`UPDATE public.climate_events SET name=${command.name},planned_start=${command.plannedStart}::date,planned_end=${command.plannedEnd}::date,version=version+1 WHERE id=${command.id}::uuid AND municipality_id=${actor.municipalityId} AND version=${command.expectedVersion} AND state IN ('PLANEJADO','EM_ANDAMENTO') RETURNING ${Prisma.raw(projection)}`;
  if (rows[0]) return present(rows[0]);
  throw new ClimateEventConflict('STALE_VERSION', 'O evento foi atualizado. Recarregue antes de tentar novamente.');
}
