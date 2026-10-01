import { can } from '@/features/access/domain/permissions';
import { AccessError } from '@/server/access/context';
import { accessResponse, withSession } from '@/server/access/session';

const pageSize = 50;

export async function GET(request: Request) {
  try {
    const rawPage = new URL(request.url).searchParams.get('page') ?? '1';
    if (!/^[1-9]\d{0,5}$/.test(rawPage)) {
      return Response.json({ error: { code: 'INVALID_INPUT', message: 'Página inválida.' } }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    const page = Number(rawPage);
    const result = await withSession(async (tx, actor) => {
      if (!can(actor, 'administer', { municipalityId: 'sa_patrulha' })) throw new AccessError(403, 'ACCESS_DENIED');
      const counts = await tx.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total FROM public.occurrences WHERE deleted_at IS NOT NULL
      `;
      const items = await tx.$queryRaw<{
        id: string; protocol: string; type: string; status: string; priority: string;
        group_id: string; group_name: string; version: number; updated_at: Date; deleted_at: Date;
      }[]>`
        SELECT o.id::text AS id,o.protocol,o.type,o.status,o.priority,o.group_id::text AS group_id,
          g.name AS group_name,o.version,o.updated_at,o.deleted_at
        FROM public.occurrences o JOIN public.groups g ON g.id=o.group_id
        WHERE o.deleted_at IS NOT NULL
        ORDER BY o.deleted_at DESC,o.id
        LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}
      `;
      return {
        items: items.map(({ group_id, group_name, updated_at, deleted_at, ...item }) => ({
          ...item,
          group: { id: group_id, name: group_name },
          updatedAt: updated_at,
          deletedAt: deleted_at,
        })),
        page,
        pageSize,
        total: counts[0]?.total ?? 0,
      };
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}
