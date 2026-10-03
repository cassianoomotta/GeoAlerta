import { AccessError } from '@/server/access/context';
import { withSession, accessResponse } from '@/server/access/session';
import { can } from '@/features/access/domain/permissions';
import { OccurrenceTriageInputError, parseOccurrenceServiceRecordInput } from '@/features/occurrences/triage-contracts';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new OccurrenceTriageInputError();
  const reader = request.body?.getReader();
  if (!reader) throw new OccurrenceTriageInputError();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > 10_000) {
        await reader.cancel();
        throw new OccurrenceTriageInputError();
      }
      chunks.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new OccurrenceTriageInputError();
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) throw new AccessError(404, 'NOT_FOUND');
    const payload = parseOccurrenceServiceRecordInput(await readJson(request));
    const record = await withSession(async (tx, actor) => {
      const occurrences = await tx.$queryRaw<{ id: string; group_id: string }[]>`
        SELECT id::text AS id,group_id::text AS group_id FROM public.occurrences
        WHERE id=${id}::uuid AND deleted_at IS NULL
      `;
      const occurrence = occurrences[0];
      if (!occurrence) throw new AccessError(404, 'NOT_FOUND');
      const scope = { municipalityId: 'sa_patrulha', groupId: occurrence.group_id };
      if (!can(actor, 'operate', scope)) throw new AccessError(403, 'ACCESS_DENIED');

      const agencies = await tx.$queryRaw<{ code: string; label: string }[]>`
        SELECT code,label FROM public.occurrence_service_agencies WHERE code=${payload.agencyCode}
      `;
      if (!agencies[0]) throw new OccurrenceTriageInputError();

      const rows = await tx.$queryRaw<{
        id: string; actor_id: string; created_at: Date; attended_at: Date;
      }[]>`
        INSERT INTO public.occurrence_service_records(
          occurrence_id,agency_code,attending_person,attended_at,action,outcome,reinforcement_requested
        ) VALUES (
          ${id}::uuid,${payload.agencyCode},${payload.attendingPerson},${payload.attendedAt}::timestamptz,
          ${payload.action},${payload.outcome},${payload.reinforcementRequested}
        ) RETURNING id::text AS id,actor_id::text AS actor_id,created_at,attended_at
      `;
      const saved = rows[0];
      if (!saved) throw new Error('SERVICE_RECORD_INSERT_FAILED');

      // Keep the history technical: service notes and citizen data stay in their protected tables.
      await tx.$executeRaw`
        INSERT INTO public.occurrence_events(occurrence_id,kind,actor_id)
        VALUES(${id}::uuid,'SERVICE_ACTION_RECORDED',${actor.userId}::uuid)
      `;
      await tx.$executeRaw`
        INSERT INTO public.audit_events(actor_id,entity_id,kind)
        VALUES(${actor.userId}::uuid,${id}::uuid,'SERVICE_ACTION_RECORDED')
      `;

      return {
        id: saved.id,
        agency: agencies[0],
        attendingPerson: payload.attendingPerson,
        attendedAt: saved.attended_at,
        action: payload.action,
        outcome: payload.outcome,
        reinforcementRequested: payload.reinforcementRequested,
        actorId: saved.actor_id,
        createdAt: saved.created_at,
        correctionOfId: null,
        correctionReason: null,
      };
    });
    return Response.json(record, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OccurrenceTriageInputError) {
      return Response.json({ error: { code: 'INVALID_INPUT', message: 'Verifique os dados informados para o registro de atendimento.' } }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    return accessResponse(error);
  }
}
