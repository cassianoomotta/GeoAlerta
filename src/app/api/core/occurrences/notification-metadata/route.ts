import { accessResponse, withSession } from '@/server/access/session';
import { requireCapability } from '@/server/access/context';

export const dynamic = 'force-dynamic';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new Error('INVALID_INPUT'); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new Error('INVALID_INPUT');
    const rawIds = (body as Record<string, unknown>).occurrenceIds;
    if (!Array.isArray(rawIds) || rawIds.length > 50 || rawIds.some((id) => typeof id !== 'string' || !uuid.test(id))) throw new Error('INVALID_INPUT');
    const ids = [...new Set(rawIds as string[])];
    const occurrences = await withSession(async (tx, actor) => {
      requireCapability(actor, 'read');
      return actor.role === 'ADMINISTRADOR'
        ? tx.$queryRaw<{ id: string; protocol: string; type: string }[]>`SELECT o.id::text,o.protocol,o.type FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id WHERE o.id=ANY(${ids}::uuid[]) AND o.deleted_at IS NULL AND g.municipality_id=${actor.municipalityId}`
        : tx.$queryRaw<{ id: string; protocol: string; type: string }[]>`SELECT id::text,protocol,type FROM public.occurrences WHERE id=ANY(${ids}::uuid[]) AND group_id=ANY(${actor.groupIds}::uuid[]) AND deleted_at IS NULL`;
    });
    return Response.json({ occurrences }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_INPUT') return Response.json({ error: { code: 'INVALID_INPUT' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}
