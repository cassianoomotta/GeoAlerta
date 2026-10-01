import { withSession, accessResponse } from '@/server/access/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await withSession(async (tx) => tx.$queryRaw<{ code: string; label: string; display_order: number }[]>`SELECT code,label,display_order FROM public.status_presentations ORDER BY display_order,code`);
    return Response.json({ items: items.map((item) => ({ code: item.code, label: item.label, displayOrder: item.display_order })) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}
