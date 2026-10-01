import { withSession, accessResponse } from '@/server/access/session';
import { AccessError } from '@/server/access/context';
import {privatePhotoAvailable} from '@/features/occurrences/photos/service';
import { can } from '@/features/access/domain/permissions';
import { parseOccurrenceMutation, OccurrenceMutationError } from '@/features/occurrences/domain/mutation';
import { mutateOccurrenceInTransaction } from '@/server/occurrences/mutate';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface OccurrenceRow {
  id: string;
  protocol: string;
  type: string;
  description: string | null;
  status: string;
  status_label: string;
  priority: string;
  group_id: string;
  group_name: string;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  opened_at: Date;
  updated_at: Date;
  version: number;
}

interface ZoneRow {
  id: string;
  name: string;
  version: number;
}

interface EventRow {
  id: string;
  kind: string;
  actorId: string | null;
  at: Date;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) throw new AccessError(404, 'NOT_FOUND');

    const result = await withSession(async (tx, actor) => {
      const rows = await tx.$queryRaw<OccurrenceRow[]>`
        SELECT o.id::text AS id,o.protocol,o.type,o.description,o.status,s.label AS status_label,
          o.priority,o.group_id::text AS group_id,g.name AS group_name,
          ST_Y(o.location::geometry)::float8 AS latitude,
          ST_X(o.location::geometry)::float8 AS longitude,
          o.accuracy::float8 AS accuracy,o.created_at AS opened_at,o.updated_at,o.version
        FROM public.occurrences o
        JOIN public.groups g ON g.id=o.group_id
        JOIN public.status_presentations s ON s.code=o.status
        WHERE o.id=${id}::uuid AND o.deleted_at IS NULL
      `;
      const occurrence = rows[0];
      if (!occurrence) throw new AccessError(404, 'NOT_FOUND');

      const zones = await tx.$queryRaw<ZoneRow[]>`
        SELECT z.zone_id::text AS id,z.name,z.version
        FROM public.occurrence_classification_zones cz
        JOIN public.risk_zones z ON z.zone_id=cz.zone_id AND z.version=cz.zone_version
        WHERE cz.occurrence_id=${id}::uuid
        ORDER BY z.name,cz.zone_id,cz.zone_version
      `;
      const events = await tx.$queryRaw<EventRow[]>`
        SELECT id::text AS id,kind,"actorId"::text AS "actorId",at
        FROM public.core_occurrence_history(${id}::uuid)
        ORDER BY at,id
      `;
      const hasPhoto = await privatePhotoAvailable(actor, {municipalityId: 'sa_patrulha', groupId: occurrence.group_id}, async () => {
        const photos = await tx.$queryRaw<{photo_object_key: string | null}[]>`SELECT photo_object_key FROM public.occurrence_private_data WHERE occurrence_id=${id}::uuid`;
        return photos[0]?.photo_object_key ?? null;
      });
      const canOperate = can(actor, 'operate', {municipalityId: 'sa_patrulha', groupId: occurrence.group_id});
      const transitionRows = canOperate ? await tx.$queryRaw<{to_status: string; enabled: boolean; roles: unknown; reason_required: boolean}[]>`
        SELECT to_status,enabled,roles,reason_required FROM public.status_transitions WHERE from_status=${occurrence.status}
      ` : [];
      const availableTransitions = transitionRows
        .filter((rule) => rule.enabled && Array.isArray(rule.roles) && rule.roles.includes(actor.role) &&
          occurrence.status !== 'RESOLVIDA' && occurrence.status !== 'CANCELADA')
        .map((rule) => ({ target: rule.to_status, reasonRequired: rule.reason_required }));
      const availableGroups = canOperate ? await tx.$queryRaw<{id: string; name: string}[]>`
        SELECT id::text AS id,name FROM public.groups
        WHERE municipality_id='sa_patrulha' ORDER BY name,id
      ` : [];

      return {
        id: occurrence.id,
        protocol: occurrence.protocol,
        type: occurrence.type,
        description: occurrence.description,
        status: { code: occurrence.status, label: occurrence.status_label },
        priority: occurrence.priority,
        group: { id: occurrence.group_id, name: occurrence.group_name },
        position: occurrence.latitude === null || occurrence.longitude === null
          ? null
          : { latitude: occurrence.latitude, longitude: occurrence.longitude, accuracy: occurrence.accuracy },
        openedAt: occurrence.opened_at,
        updatedAt: occurrence.updated_at,
        version: occurrence.version,
        classification: zones.length ? { zones } : null,
        events,
        actions: { canOperate, availableTransitions },
        availableGroups,
        ...(hasPhoto ? {privateData: {hasPhoto: true}} : {}),
      };
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}

const maximumMutationBodyBytes = 8_192;

async function readMutationPayload(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new OccurrenceMutationError(422, 'INVALID_INPUT');
  }
  const reader = request.body?.getReader();
  if (!reader) throw new OccurrenceMutationError(422, 'INVALID_INPUT');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > maximumMutationBodyBytes) {
        await reader.cancel();
        throw new OccurrenceMutationError(422, 'INVALID_INPUT');
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new OccurrenceMutationError(422, 'INVALID_INPUT');
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) throw new AccessError(404, 'NOT_FOUND');
    const payload = parseOccurrenceMutation(await readMutationPayload(request));
    const result = await withSession((tx, actor) => mutateOccurrenceInTransaction(tx, actor, id, payload));
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof OccurrenceMutationError) {
      const messages: Record<string, string> = {
        INVALID_INPUT: 'Verifique os campos e a versão informados.',
        ACCESS_DENIED: 'Você não tem permissão para esta alteração ou grupo.',
        NOT_FOUND: 'Ocorrência não encontrada.',
        VERSION_CONFLICT: 'A ocorrência mudou desde a última leitura. Atualize os dados antes de tentar novamente.',
        TRANSITION_NOT_ALLOWED: 'Esta transição não está habilitada para seu papel.',
        REASON_REQUIRED: 'Informe uma justificativa com pelo menos 10 caracteres.',
        NO_CHANGES: 'Nenhuma alteração foi informada.',
      };
      return Response.json({ error: { code: error.code, message: messages[error.code] ?? 'Não foi possível alterar a ocorrência.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    return accessResponse(error);
  }
}
