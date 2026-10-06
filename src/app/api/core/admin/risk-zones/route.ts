import { createHash, randomUUID } from 'node:crypto';
import { assertRiskZoneVersion, parseCreateRiskZone, parseUpdateRiskZone, RiskZoneDuplicateError, RiskZoneInputError, RiskZoneVersionConflictError, type RiskZoneCreate, type RiskZoneUpdate } from '@/features/occurrences/domain/risk-zones';
import { accessResponse, withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import type { Prisma } from '../../../../../../prisma/generated/client/client';

export const dynamic = 'force-dynamic';

function parseSnapshotInstant(value: string | null): string | null {
  if (value === null) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!match) return null;
  const [, year, month, day, hour, minute, second = '0', , , offsetHour, offsetMinute] = match;
  const calendar = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  if (calendar.getUTCFullYear() !== Number(year) || calendar.getUTCMonth() !== Number(month) - 1 || calendar.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 || Number(offsetHour ?? 0) > 14 || Number(offsetMinute ?? 0) > 59 || (Number(offsetHour ?? 0) === 14 && Number(offsetMinute ?? 0) > 0)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

async function snapshotAt(tx: Prisma.TransactionClient, at: string) {
  const rows = await tx.$queryRaw<{ zone_id: string; version: number; name: string; type: string; active: boolean; valid_from: Date | null; valid_to: Date | null; geometry: unknown }[]>`
    WITH zone_ids AS (SELECT DISTINCT zone_id FROM public.risk_zones),
    effective AS (
      SELECT zone_id,geoalerta_private.effective_risk_zone_version(zone_id,${at}::timestamptz) AS version
      FROM zone_ids
    )
    SELECT z.zone_id::text AS zone_id,z.version,z.name,z.type,z.active,z.valid_from,z.valid_to,ST_AsGeoJSON(z.geometry)::jsonb AS geometry
    FROM effective e JOIN public.risk_zones z ON z.zone_id=e.zone_id AND z.version=e.version
    WHERE e.version IS NOT NULL AND z.active
      AND (z.valid_from IS NULL OR z.valid_from <= ${at}::timestamptz)
      AND (z.valid_to IS NULL OR z.valid_to > ${at}::timestamptz)
    ORDER BY z.name,z.zone_id
  `;
  return { at, zones: rows.map((zone) => ({ zoneId: zone.zone_id, version: zone.version, name: zone.name, type: zone.type, active: zone.active, validFrom: zone.valid_from?.toISOString() ?? null, validTo: zone.valid_to?.toISOString() ?? null, geometry: zone.geometry })) };
}

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    if ([...params.keys()].some((key) => key !== 'at' && key !== 'compareAt') || params.getAll('at').length > 1 || params.getAll('compareAt').length > 1) throw new RiskZoneInputError();
    const atInput = params.get('at');
    const compareInput = params.get('compareAt');
    if (compareInput !== null && atInput === null) throw new RiskZoneInputError();
    const at = atInput === null ? null : parseSnapshotInstant(atInput);
    const compareAt = compareInput === null ? null : parseSnapshotInstant(compareInput);
    if ((atInput !== null && at === null) || (compareInput !== null && compareAt === null)) throw new RiskZoneInputError();
    const result = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      if (at) {
        if (compareAt) return { snapshots: [await snapshotAt(tx, at), await snapshotAt(tx, compareAt)] };
        return { snapshot: await snapshotAt(tx, at) };
      }
      const items = await tx.$queryRaw<{ zone_id: string; version: number; name: string; type: string; active: boolean; valid_from: Date | null; valid_to: Date | null; geometry: unknown }[]>`
        SELECT DISTINCT ON (zone_id) zone_id::text AS zone_id,version,name,type,active,valid_from,valid_to,ST_AsGeoJSON(geometry)::jsonb AS geometry
        FROM public.risk_zones ORDER BY zone_id,version DESC
      `;
      return { zones: items.map((zone) => ({ zoneId: zone.zone_id, version: zone.version, name: zone.name, type: zone.type, active: zone.active, validFrom: zone.valid_from?.toISOString() ?? null, validTo: zone.valid_to?.toISOString() ?? null, geometry: zone.geometry })) };
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof RiskZoneInputError) return Response.json({ error: { code: error.message, message: 'Informe um instante ISO-8601 válido e os parâmetros at e compareAt em conjunto.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}

async function assertReplacementExists(tx: Prisma.TransactionClient, zoneId: string, replacesZoneId?: string) {
  if (!replacesZoneId) return;
  if (zoneId === replacesZoneId) throw new RiskZoneInputError();
  const rows = await tx.$queryRaw<{ found: boolean }[]>`SELECT EXISTS(SELECT 1 FROM public.risk_zones WHERE zone_id=${replacesZoneId}::uuid) AS found`;
  if (!rows[0]?.found) throw new AccessError(404, 'NOT_FOUND');
}

async function assertNoExactDuplicate(tx: Prisma.TransactionClient, zoneId: string, input: RiskZoneCreate | RiskZoneUpdate) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended('risk-zone-exact-duplicate',0)) IS NOT NULL AS acquired`;
  const geometryJson = JSON.stringify(input.geometry);
  const duplicates = await tx.$queryRaw<{ zone_id: string }[]>`
    SELECT existing.zone_id::text AS zone_id FROM public.risk_zones AS existing
    WHERE existing.zone_id <> ${zoneId}::uuid AND existing.type = ${input.type}
      AND ST_Equals(existing.geometry,ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326)))
      AND (existing.valid_to IS NULL OR ${input.validFrom}::timestamptz IS NULL OR existing.valid_to > ${input.validFrom}::timestamptz)
      AND (${input.validTo}::timestamptz IS NULL OR existing.valid_from IS NULL OR ${input.validTo}::timestamptz > existing.valid_from)
    LIMIT 1
  `;
  if (duplicates.length && !input.duplicateOverrideReason) throw new RiskZoneDuplicateError();
}

async function insertVersion(tx: Prisma.TransactionClient, actorId: string, zoneId: string, version: number, input: RiskZoneCreate | RiskZoneUpdate, kind: 'ADMIN_RISK_ZONE_CREATED' | 'ADMIN_RISK_ZONE_VERSION_CREATED') {
  const geometryJson = JSON.stringify(input.geometry);
  const geometryCheck = await tx.$queryRaw<{ valid: boolean }[]>`SELECT ST_IsValid(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))) AND NOT ST_IsEmpty(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))) AS valid`;
  if (!geometryCheck[0]?.valid) throw new RiskZoneInputError();
  await assertReplacementExists(tx, zoneId, input.replacesZoneId);
  await assertNoExactDuplicate(tx, zoneId, input);
  await tx.$executeRaw`
    INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry)
    VALUES(${zoneId}::uuid,${version},${input.name},${input.type},${input.active},${input.validFrom}::timestamptz,${input.validTo}::timestamptz,
      ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))::geometry(MultiPolygon,4326))
  `;
  const geometryHash = createHash('sha256').update(geometryJson).digest('hex');
  const changes = JSON.stringify({ version, name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, replacesZoneId: input.replacesZoneId ?? null, reason: input.reason, duplicateOverrideReason: input.duplicateOverrideReason ?? null, geometryType: input.geometry.type, geometrySha256: geometryHash });
  await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actorId}::uuid,${zoneId}::uuid,${kind},${input.reason},${changes}::jsonb)`;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new RiskZoneInputError(); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new RiskZoneInputError();
    const input = body as Record<string, unknown>;
    if (input.action === 'create') {
      if (Object.keys(input).some((key) => !['action','name','type','active','validFrom','validTo','geometry','reason','replacesZoneId','duplicateOverrideReason'].includes(key))) throw new RiskZoneInputError();
      const zone = parseCreateRiskZone({ name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, geometry: input.geometry, reason: input.reason, replacesZoneId: input.replacesZoneId, duplicateOverrideReason: input.duplicateOverrideReason });
      const result = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        const zoneId = randomUUID();
        await insertVersion(tx, actor.userId, zoneId, 1, zone, 'ADMIN_RISK_ZONE_CREATED');
        return { zoneId, version: 1 };
      });
      return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'update') {
      if (Object.keys(input).some((key) => !['action','zoneId','expectedVersion','name','type','active','validFrom','validTo','geometry','reason','replacesZoneId','duplicateOverrideReason'].includes(key))) throw new RiskZoneInputError();
      const zone = parseUpdateRiskZone({ zoneId: input.zoneId, expectedVersion: input.expectedVersion, name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, geometry: input.geometry, reason: input.reason, replacesZoneId: input.replacesZoneId, duplicateOverrideReason: input.duplicateOverrideReason });
      const result = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${zone.zoneId},0)) IS NOT NULL AS acquired`;
        const current = await tx.$queryRaw<{ version: number }[]>`SELECT version FROM public.risk_zones WHERE zone_id=${zone.zoneId}::uuid ORDER BY version DESC LIMIT 1`;
        if (!current[0]) throw new AccessError(404, 'NOT_FOUND');
        assertRiskZoneVersion(current[0].version, zone.expectedVersion);
        const version = current[0].version + 1;
        await insertVersion(tx, actor.userId, zone.zoneId, version, zone, 'ADMIN_RISK_ZONE_VERSION_CREATED');
        return { zoneId: zone.zoneId, version };
      });
      return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
    }
    throw new RiskZoneInputError();
  } catch (error) {
    if (error instanceof RiskZoneInputError) return Response.json({ error: { code: error.message, message: 'Confira nome, tipo, motivo, vigência e geometria Polygon/MultiPolygon válidos.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof RiskZoneVersionConflictError) return Response.json({ error: { code: error.message, message: 'Esta zona mudou desde que foi carregada. Atualize a lista e reaplique sua alteração.' } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof RiskZoneDuplicateError) return Response.json({ error: { code: error.message, message: 'Já existe outra zona do mesmo tipo com geometria igual e vigência sobreposta. Informe uma justificativa explícita para prosseguir.' } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}
