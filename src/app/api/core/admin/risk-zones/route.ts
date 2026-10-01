import { createHash, randomUUID } from 'node:crypto';
import { assertRiskZoneVersion, parseCreateRiskZone, parseUpdateRiskZone, RiskZoneInputError, RiskZoneVersionConflictError, type RiskZoneInput } from '@/features/occurrences/domain/risk-zones';
import { accessResponse, withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import type { Prisma } from '../../../../../../prisma/generated/client/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      return tx.$queryRaw<{ zone_id: string; version: number; name: string; type: string; active: boolean; valid_from: Date | null; valid_to: Date | null; geometry: unknown }[]>`
        SELECT DISTINCT ON (zone_id) zone_id::text AS zone_id,version,name,type,active,valid_from,valid_to,ST_AsGeoJSON(geometry)::jsonb AS geometry
        FROM public.risk_zones ORDER BY zone_id,version DESC
      `;
    });
    return Response.json({ zones: items.map((zone) => ({ zoneId: zone.zone_id, version: zone.version, name: zone.name, type: zone.type, active: zone.active, validFrom: zone.valid_from?.toISOString() ?? null, validTo: zone.valid_to?.toISOString() ?? null, geometry: zone.geometry })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}

async function insertVersion(tx: Prisma.TransactionClient, actorId: string, zoneId: string, version: number, input: RiskZoneInput, kind: 'ADMIN_RISK_ZONE_CREATED' | 'ADMIN_RISK_ZONE_VERSION_CREATED') {
  const geometryJson = JSON.stringify(input.geometry);
  const geometryCheck = await tx.$queryRaw<{ valid: boolean }[]>`SELECT ST_IsValid(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))) AND NOT ST_IsEmpty(ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))) AS valid`;
  if (!geometryCheck[0]?.valid) throw new RiskZoneInputError();
  await tx.$executeRaw`
    INSERT INTO public.risk_zones(zone_id,version,name,type,active,valid_from,valid_to,geometry)
    VALUES(${zoneId}::uuid,${version},${input.name},${input.type},${input.active},${input.validFrom}::timestamptz,${input.validTo}::timestamptz,
      ST_Multi(ST_SetSRID(ST_GeomFromGeoJSON(${geometryJson}),4326))::geometry(MultiPolygon,4326))
  `;
  const geometryHash = createHash('sha256').update(geometryJson).digest('hex');
  const changes = JSON.stringify({ version, name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, geometryType: input.geometry.type, geometrySha256: geometryHash });
  await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actorId}::uuid,${zoneId}::uuid,${kind},'Configuração administrativa de zona',${changes}::jsonb)`;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new RiskZoneInputError(); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new RiskZoneInputError();
    const input = body as Record<string, unknown>;
    if (input.action === 'create') {
      if (Object.keys(input).some((key) => !['action','name','type','active','validFrom','validTo','geometry'].includes(key))) throw new RiskZoneInputError();
      const zone = parseCreateRiskZone({ name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, geometry: input.geometry });
      const result = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        const zoneId = randomUUID();
        await insertVersion(tx, actor.userId, zoneId, 1, zone, 'ADMIN_RISK_ZONE_CREATED');
        return { zoneId, version: 1 };
      });
      return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'update') {
      if (Object.keys(input).some((key) => !['action','zoneId','expectedVersion','name','type','active','validFrom','validTo','geometry'].includes(key))) throw new RiskZoneInputError();
      const zone = parseUpdateRiskZone({ zoneId: input.zoneId, expectedVersion: input.expectedVersion, name: input.name, type: input.type, active: input.active, validFrom: input.validFrom, validTo: input.validTo, geometry: input.geometry });
      const result = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${zone.zoneId},0))`;
        // Versions are append-only; the advisory lock serializes version allocation
        // without requiring UPDATE privileges on historical geometry rows.
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
    if (error instanceof RiskZoneInputError) return Response.json({ error: { code: error.message, message: 'Confira nome, tipo, vigência e geometria Polygon/MultiPolygon válidos.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (error instanceof RiskZoneVersionConflictError) return Response.json({ error: { code: error.message, message: 'Esta zona mudou desde que foi carregada. Atualize a lista e reaplique sua alteração.' } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}
