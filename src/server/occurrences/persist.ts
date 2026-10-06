import { randomUUID } from 'node:crypto';
import type { Prisma } from '../../../prisma/generated/client/client';
import type { OpenResult, PublicOccurrenceInput, Priority } from '@/features/occurrences/contracts';

export type OccurrenceClassification = { priority: Priority; zones: { zoneId: string; version: number }[] };

export async function classifyOccurrence(
  tx: Prisma.TransactionClient,
  position: PublicOccurrenceInput['position'],
): Promise<OccurrenceClassification> {
  const zones = await tx.$queryRaw<{ zone_id: string; version: number }[]>`
    SELECT z.zone_id::text AS zone_id,z.version FROM public.risk_zones z
    WHERE z.version=geoalerta_private.effective_risk_zone_version(z.zone_id,transaction_timestamp())
      AND z.active
      AND (z.valid_from IS NULL OR z.valid_from<=transaction_timestamp())
      AND (z.valid_to IS NULL OR z.valid_to>transaction_timestamp())
      AND ST_Intersects(z.geometry,ST_SetSRID(ST_MakePoint(${position.longitude},${position.latitude}),4326))
    ORDER BY z.zone_id,z.version
  `;
  return {
    priority: zones.length ? 'ALTA' : 'NORMAL',
    zones: zones.map((zone) => ({ zoneId: zone.zone_id, version: zone.version })),
  };
}

/** Shared atomic write set for the authenticated panel and public intake flows. */
export async function persistOccurrence(
  tx: Prisma.TransactionClient,
  command: {
    input: PublicOccurrenceInput;
    groupId: string;
    idempotencyKey: string;
    requestHash: string;
    classification: OccurrenceClassification;
    actorId: string | null;
    occurrenceId?: string;
    photoObjectKey?: string | null;
  },
): Promise<OpenResult> {
  const id = command.occurrenceId ?? randomUUID();
  const eventId = randomUUID();
  const inserted = await tx.$queryRaw<{ protocol: string }[]>`
    INSERT INTO public.occurrences(id,type,description,address,location,accuracy,status,priority,group_id,needs_medical_support)
    VALUES(${id}::uuid,${command.input.type},${command.input.description},${command.input.address},
      ST_SetSRID(ST_MakePoint(${command.input.position.longitude},${command.input.position.latitude}),4326)::geography,
      ${command.input.position.accuracy},'NOVA',${command.classification.priority},${command.groupId}::uuid,${command.input.needsMedicalSupport ?? null})
    RETURNING protocol
  `;
  if (!inserted[0]) throw new Error('Occurrence protocol was not generated.');
  const result: OpenResult = {
    id,
    protocol: inserted[0].protocol,
    status: 'NOVA',
    priority: command.classification.priority,
    version: 1,
  };
  await tx.$executeRaw`
    INSERT INTO public.occurrence_private_data(occurrence_id,reporter_name,reporter_contact,photo_object_key)
    VALUES(${id}::uuid,${command.input.reporterName},${command.input.reporterContact},${command.photoObjectKey ?? null})
  `;
  for (const zone of command.classification.zones) {
    await tx.$executeRaw`
      INSERT INTO public.occurrence_classification_zones(occurrence_id,zone_id,zone_version)
      VALUES(${id}::uuid,${zone.zoneId}::uuid,${zone.version})
    `;
  }
  await tx.$executeRaw`
    INSERT INTO public.occurrence_events(id,occurrence_id,kind,actor_id)
    VALUES(${eventId}::uuid,${id}::uuid,'OPENED',${command.actorId}::uuid)
  `;
  await tx.$executeRaw`
    INSERT INTO public.audit_events(actor_id,entity_id,kind)
    VALUES(${command.actorId}::uuid,${id}::uuid,'OPENED')
  `;
  await tx.$executeRaw`
    INSERT INTO public.occurrence_alerts(event_id,occurrence_id,group_id,priority,status)
    VALUES(${eventId}::uuid,${id}::uuid,${command.groupId}::uuid,${result.priority},'NOVA')
  `;
  await tx.$executeRaw`
    INSERT INTO public.idempotency_keys(key,request_hash,occurrence_id,response)
    VALUES(${command.idempotencyKey},${command.requestHash},${id}::uuid,${JSON.stringify(result)}::jsonb)
  `;
  return result;
}
