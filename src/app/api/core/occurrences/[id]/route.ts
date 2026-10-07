import { withSession, accessResponse } from '@/server/access/session';
import { AccessError } from '@/server/access/context';
import {privatePhotoAvailable} from '@/features/occurrences/photos/service';
import { can } from '@/features/access/domain/permissions';
import { parseOccurrenceMutation, OccurrenceMutationError } from '@/features/occurrences/domain/mutation';
import { mutateOccurrenceInTransaction } from '@/server/occurrences/mutate';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function postgresCode(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== 'object' || error === null) return undefined;
  const value=error as Record<string,unknown>;
  if(typeof value.code==='string'&&/^[0-9A-Z]{5}$/.test(value.code)&&!value.code.startsWith('P'))return value.code;
  if(typeof value.message==='string'){const match=value.message.match(/\b(23514|40001|42501)\b/);if(match)return match[1];}
  if(typeof value.meta==='object'&&value.meta!==null){const code=(value.meta as Record<string,unknown>).code;if(typeof code==='string'&&/^[0-9A-Z]{5}$/.test(code))return code;}
  for(const nested of Object.values(value)){const code=postgresCode(nested,depth+1);if(code)return code;}
  return undefined;
}

interface OccurrenceRow {
  id: string;
  protocol: string;
  type: string;
  description: string | null;
  address: string | null;
  status: string;
  status_label: string;
  priority: string;
  group_id: string;
  group_name: string;
  climate_event_id: string | null;
  climate_event_name: string | null;
  climate_event_state: 'PLANEJADO' | 'EM_ANDAMENTO' | 'ENCERRADO' | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  registration_channel: 'PUBLICO' | 'MANUAL' | 'BATALHAO' | null;
  location_source: 'GPS_NATIVO' | 'MAPA' | null;
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

interface ServiceRecordRow {
  id: string;
  agency_code: string;
  agency_label: string;
  attending_person: string;
  attended_at: Date;
  action: string;
  outcome: string | null;
  reinforcement_requested: boolean;
  actor_id: string;
  created_at: Date;
  correction_of_id: string | null;
  correction_reason: string | null;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!uuidPattern.test(id)) throw new AccessError(404, 'NOT_FOUND');

    const result = await withSession(async (tx, actor) => {
      const rows = await tx.$queryRaw<(OccurrenceRow & {
        registering_institution_code: string | null; registering_institution_label: string | null;
        neighborhood_code: string | null; neighborhood_label: string | null;
        locality_code: string | null; locality_label: string | null;
        occurrence_situation: string | null; damage_location_code: string | null;
        damage_location_label: string | null; damage_location_detail: string | null;
        has_victims: boolean | null; has_displaced: boolean | null;
        needs_medical_support: boolean | null;
      })[]>`
        SELECT o.id::text AS id,o.protocol,o.type,o.description,o.address,o.status,s.label AS status_label,
          o.priority,o.group_id::text AS group_id,g.name AS group_name,
          ce.id::text AS climate_event_id,ce.name AS climate_event_name,ce.state AS climate_event_state,
          ST_Y(o.location::geometry)::float8 AS latitude,
          ST_X(o.location::geometry)::float8 AS longitude,
          o.accuracy::float8 AS accuracy,o.registration_channel,o.location_source,
          o.created_at AS opened_at,o.updated_at,o.version,
          o.registering_institution_code,ri.label AS registering_institution_label,
          o.neighborhood_code,n.label AS neighborhood_label,o.locality_code,l.label AS locality_label,
          o.occurrence_situation,o.damage_location_code,d.label AS damage_location_label,
          o.damage_location_detail,o.has_victims,o.has_displaced,o.needs_medical_support
        FROM public.occurrences o
        JOIN public.groups g ON g.id=o.group_id
        JOIN public.status_presentations s ON s.code=o.status
        LEFT JOIN public.climate_events ce ON ce.id=o.climate_event_id
        LEFT JOIN public.occurrence_registering_institutions ri ON ri.code=o.registering_institution_code
        LEFT JOIN public.occurrence_neighborhoods n ON n.code=o.neighborhood_code
        LEFT JOIN public.occurrence_localities l ON l.code=o.locality_code
        LEFT JOIN public.occurrence_damage_locations d ON d.code=o.damage_location_code
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
      const scope = { municipalityId: 'sa_patrulha', groupId: occurrence.group_id };
      const privateCapability = can(actor, 'privateData', scope);
      const privateRows = privateCapability ? await tx.$queryRaw<{reporter_name: string | null; reporter_contact: string | null; photo_object_key: string | null}[]>`
        SELECT reporter_name,reporter_contact,photo_object_key FROM public.occurrence_private_data WHERE occurrence_id=${id}::uuid
      ` : [];
      const privateRow = privateRows[0];
      const hasPhoto = privateRow ? await privatePhotoAvailable(actor, scope, async () => privateRow.photo_object_key) : false;
      const canOperate = can(actor, 'operate', scope);
      const canReclassify = can(actor, 'reclassify', scope);
      const canAdminister = can(actor, 'administer', scope);
      const transitionRows = canOperate ? await tx.$queryRaw<{to_status: string; enabled: boolean; roles: unknown; reason_required: boolean}[]>`
        SELECT to_status,enabled,roles,reason_required FROM public.status_transitions WHERE from_status=${occurrence.status}
      ` : [];
      const availableTransitions = transitionRows
        .filter((rule) => rule.enabled && Array.isArray(rule.roles) && rule.roles.includes(actor.role) &&
          ((occurrence.status !== 'RESOLVIDA' && occurrence.status !== 'CANCELADA') || canReclassify))
        .map((rule) => ({ target: rule.to_status, reasonRequired: rule.reason_required }));
      const availableGroups = canOperate ? await tx.$queryRaw<{id: string; name: string}[]>`
        SELECT id::text AS id,name FROM public.groups
        WHERE municipality_id='sa_patrulha' ORDER BY name,id
      ` : [];
      const serviceAgencyOptions = canOperate ? await tx.$queryRaw<{code: string; label: string}[]>`
        SELECT code,label FROM public.occurrence_service_agencies ORDER BY display_order,code
      ` : [];
      const serviceRows = await tx.$queryRaw<ServiceRecordRow[]>`
        SELECT r.id::text AS id,r.agency_code,a.label AS agency_label,r.attending_person,r.attended_at,
          r.action,r.outcome,r.reinforcement_requested,r.actor_id::text AS actor_id,r.created_at,
          r.correction_of_id::text AS correction_of_id,r.correction_reason
        FROM public.occurrence_service_records r
        JOIN public.occurrence_service_agencies a ON a.code=r.agency_code
        WHERE r.occurrence_id=${id}::uuid
        ORDER BY r.attended_at,r.id
      `;

      return {
        id: occurrence.id,
        protocol: occurrence.protocol,
        type: occurrence.type,
        description: occurrence.description,
        address: occurrence.address,
        status: { code: occurrence.status, label: occurrence.status_label },
        priority: occurrence.priority,
        group: { id: occurrence.group_id, name: occurrence.group_name },
        position: occurrence.latitude === null || occurrence.longitude === null
          ? null
          : { latitude: occurrence.latitude, longitude: occurrence.longitude, accuracy: occurrence.accuracy },
        registrationChannel: occurrence.registration_channel,
        locationSource: occurrence.location_source,
        openedAt: occurrence.opened_at,
        updatedAt: occurrence.updated_at,
        version: occurrence.version,
        classification: zones.length ? { zones } : null,
        occurrenceContext: {
          registeringInstitution: occurrence.registering_institution_code ? { code: occurrence.registering_institution_code, label: occurrence.registering_institution_label } : null,
          neighborhood: occurrence.neighborhood_code ? { code: occurrence.neighborhood_code, label: occurrence.neighborhood_label } : null,
          locality: occurrence.locality_code ? { code: occurrence.locality_code, label: occurrence.locality_label } : null,
        },
        triage: {
          situation: occurrence.occurrence_situation,
          damageLocation: occurrence.damage_location_code ? { code: occurrence.damage_location_code, label: occurrence.damage_location_label, detail: occurrence.damage_location_detail } : null,
          hasVictims: occurrence.has_victims,
          hasDisplaced: occurrence.has_displaced,
          needsMedicalSupport: occurrence.needs_medical_support,
        },
        serviceRecords: serviceRows.map((record) => ({
          id: record.id,
          agency: { code: record.agency_code, label: record.agency_label },
          attendingPerson: record.attending_person,
          attendedAt: record.attended_at,
          action: record.action,
          outcome: record.outcome,
          reinforcementRequested: record.reinforcement_requested,
          actorId: record.actor_id,
          createdAt: record.created_at,
          correctionOfId: record.correction_of_id,
          correctionReason: record.correction_reason,
        })),
        events,
        actions: { canOperate, canReclassify, canAdminister, availableTransitions },
        availableGroups,
        serviceAgencyOptions,
        climateEvent: occurrence.climate_event_id ? { id: occurrence.climate_event_id, name: occurrence.climate_event_name, state: occurrence.climate_event_state } : null,
        climateEvents: canReclassify ? await tx.$queryRaw<{id:string;name:string;state:'PLANEJADO'|'EM_ANDAMENTO'|'ENCERRADO'}[]>`
          SELECT id::text,name,state FROM public.climate_events WHERE municipality_id=${actor.municipalityId} ORDER BY name,id
        ` : [],
        ...(privateCapability ? { privateData: {
          reporterName: privateRow?.reporter_name ?? null,
          reporterContact: privateRow?.reporter_contact ?? null,
          hasPhoto,
        } } : {}),
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
        ALREADY_DELETED: 'A ocorrência já está excluída.',
        NOT_DELETED: 'A ocorrência não está excluída.',
      };
      return Response.json({ error: { code: error.code, message: messages[error.code] ?? 'Não foi possível alterar a ocorrência.' } }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
    }
    const code=postgresCode(error);
    if(code==='23514')return Response.json({error:{code:'INVALID_CLIMATE_EVENT_LINK',message:'O evento escolhido não pode ser vinculado a esta ocorrência.'}},{status:422,headers:{'Cache-Control':'no-store'}});
    if(code==='40001')return Response.json({error:{code:'VERSION_CONFLICT',message:'A ocorrência mudou desde a última leitura. Atualize os dados antes de tentar novamente.'}},{status:409,headers:{'Cache-Control':'no-store'}});
    if(code==='42501')return Response.json({error:{code:'ACCESS_DENIED',message:'Você não tem permissão para esta alteração.'}},{status:403,headers:{'Cache-Control':'no-store'}});
    return accessResponse(error);
  }
}
