import { randomUUID } from 'node:crypto';
import type { AdminShelter } from '@/features/shelters/contracts';
import { parseShelterInput, ShelterInputError } from '@/features/shelters/domain/input';
import { accessResponse, withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';

export const dynamic = 'force-dynamic';

type ShelterRow = {
  id: string; name: string; type: string; address: string; lat: number; lng: number;
  capacity: number; occupied: number; phone: string | null; manager: string | null;
  status: AdminShelter['status']; is_active: boolean; created_at: Date | null;
};
function present(row: ShelterRow): AdminShelter {
  return { id: row.id, name: row.name, type: row.type as AdminShelter['type'], address: row.address, lat: row.lat, lng: row.lng,
    capacity: row.capacity, occupied: row.occupied, phone: row.phone, manager: row.manager, status: row.status,
    isActive: row.is_active, createdAt: row.created_at?.toISOString() ?? null };
}
function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new ShelterInputError();
  return value as Record<string, unknown>;
}
function id(value: unknown): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new ShelterInputError();
  return value;
}
function hasOnly(input: Record<string, unknown>, fields: string[]) {
  if (Object.keys(input).some(key => !fields.includes(key))) throw new ShelterInputError();
}
function postgresCode(error: unknown, depth = 0): string | undefined {
  if (depth > 6) return undefined;
  if (typeof error === 'string') return /\b23503\b|foreign key constraint/i.test(error) ? '23503' : undefined;
  if (typeof error !== 'object' || error === null) return undefined;
  const value = error as Record<string, unknown>;
  if (value.code === '23503' || (typeof value.meta === 'object' && value.meta !== null && 'code' in value.meta && value.meta.code === '23503')) return '23503';
  for (const nested of Object.values(value)) {
    const code = postgresCode(nested, depth + 1);
    if (code === '23503') return code;
  }
  if (typeof value.code === 'string' && /^[0-9A-Z]{5}$/.test(value.code) && !value.code.startsWith('P')) return value.code;
  return undefined;
}

export async function GET() {
  try {
    const shelters = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      const rows = await tx.$queryRaw<ShelterRow[]>`SELECT id::text,name,type,address,lat,lng,capacity,occupied,phone,manager,status,is_active,created_at FROM public.shelters WHERE municipio='sa_patrulha' ORDER BY name,id`;
      return rows.map(present);
    });
    return Response.json({ shelters }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return accessResponse(error); }
}

export async function POST(request: Request) {
  try {
    let input: Record<string, unknown>;
    try { input = record(await request.json()); } catch (error) { if (error instanceof ShelterInputError) throw error; throw new ShelterInputError(); }
    if (input.action === 'create') {
      hasOnly(input, ['action','name','type','address','lat','lng','mapUrl','capacity','occupied','phone','manager','status','isActive']);
      const shelter = parseShelterInput(input);
      const saved = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        const shelterId = randomUUID();
        const rows = await tx.$queryRaw<ShelterRow[]>`
          INSERT INTO public.shelters(id,municipio,name,type,address,lat,lng,capacity,occupied,phone,manager,status,is_active)
          VALUES(${shelterId}::uuid,'sa_patrulha',${shelter.name},${shelter.type},${shelter.address},${shelter.lat},${shelter.lng},${shelter.capacity},${shelter.occupied},${shelter.phone},${shelter.manager},${shelter.status},${shelter.isActive})
          RETURNING id::text,name,type,address,lat,lng,capacity,occupied,phone,manager,status,is_active,created_at
        `;
        await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${shelterId}::uuid,'ADMIN_SHELTER_CREATED','Cadastro administrativo de abrigo',${JSON.stringify(shelter)}::jsonb)`;
        return present(rows[0]);
      });
      return Response.json(saved, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'update') {
      hasOnly(input, ['action','id','name','type','address','lat','lng','mapUrl','capacity','occupied','phone','manager','status','isActive']);
      const shelterId = id(input.id);
      const shelter = parseShelterInput(input);
      const saved = await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        const existing = await tx.$queryRaw<{ is_active: boolean }[]>`SELECT is_active FROM public.shelters WHERE id=${shelterId}::uuid AND municipio='sa_patrulha'`;
        if (!existing[0]) throw new AccessError(404, 'NOT_FOUND');
        const rows = await tx.$queryRaw<ShelterRow[]>`
          UPDATE public.shelters SET name=${shelter.name},type=${shelter.type},address=${shelter.address},lat=${shelter.lat},lng=${shelter.lng},capacity=${shelter.capacity},occupied=${shelter.occupied},phone=${shelter.phone},manager=${shelter.manager},status=${shelter.status},is_active=${shelter.isActive}
          WHERE id=${shelterId}::uuid AND municipio='sa_patrulha' RETURNING id::text,name,type,address,lat,lng,capacity,occupied,phone,manager,status,is_active,created_at
        `;
        const kind = existing[0].is_active !== shelter.isActive ? shelter.isActive ? 'ADMIN_SHELTER_ACTIVATED' : 'ADMIN_SHELTER_DEACTIVATED' : 'ADMIN_SHELTER_UPDATED';
        await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${shelterId}::uuid,${kind},'Atualização administrativa de abrigo',${JSON.stringify(shelter)}::jsonb)`;
        return present(rows[0]);
      });
      return Response.json(saved, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (input.action === 'delete') {
      hasOnly(input, ['action','id']);
      const shelterId = id(input.id);
      await withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        const rows = await tx.$queryRaw<{ id: string; name: string }[]>`DELETE FROM public.shelters WHERE id=${shelterId}::uuid AND municipio='sa_patrulha' RETURNING id::text,name`;
        if (!rows[0]) throw new AccessError(404, 'NOT_FOUND');
        await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${shelterId}::uuid,'ADMIN_SHELTER_DELETED','Exclusão administrativa de abrigo',${JSON.stringify({ name: rows[0].name })}::jsonb)`;
      });
      return Response.json({ deleted: true }, { headers: { 'Cache-Control': 'no-store' } });
    }
    throw new ShelterInputError();
  } catch (error) {
    if (error instanceof ShelterInputError) return Response.json({ error: { code: 'INVALID_SHELTER', message: 'Confira os dados do abrigo, endereço e coordenadas válidos.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    if (postgresCode(error) === '23503') return Response.json({ error: { code: 'SHELTER_HAS_LINKED_PEOPLE', message: 'Este abrigo possui pessoas vinculadas. Desative-o para removê-lo do catálogo.' } }, { status: 409, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}
