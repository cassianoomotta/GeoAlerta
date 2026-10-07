import 'server-only';
import type { Prisma } from '../../../prisma/generated/client/client';

/** Resolve once per new idempotent intake while sharing the lifecycle lock with start/close. */
export async function resolveActiveClimateEvent(tx: Prisma.TransactionClient, municipalityId: string): Promise<string | null> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`climate-event:${municipalityId}`},0))`;
  const rows = await tx.$queryRaw<{ id: string }[]>`
    SELECT id::text AS id FROM public.climate_events
    WHERE municipality_id=${municipalityId} AND state='EM_ANDAMENTO'
    ORDER BY id LIMIT 1
  `;
  return rows[0]?.id ?? null;
}
