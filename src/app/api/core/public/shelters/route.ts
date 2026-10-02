import { listOpenShelters } from '@/server/occurrences/intake';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shelters = await listOpenShelters();
    return Response.json({ shelters }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Não foi possível consultar os abrigos disponíveis.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
