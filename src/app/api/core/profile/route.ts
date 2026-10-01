import { ProfileInputError, parseProfileUpdate } from '@/features/access/domain/profile';
import { availableColumns } from '@/features/occurrences/list-input';
import { getColumns } from '@/features/access/infrastructure/preferences';
import { AccessError } from '@/server/access/context';
import { accessResponse, sessionClient, withSession } from '@/server/access/session';

export const runtime = 'nodejs';
const maximumBodyBytes = 2_048;

async function readProfileUpdate(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new ProfileInputError();
  const reader = request.body?.getReader();
  if (!reader) throw new ProfileInputError();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > maximumBodyBytes) {
        await reader.cancel();
        throw new ProfileInputError();
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new ProfileInputError();
  }
}

async function authenticatedEmail() {
  const client = await sessionClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.email) throw new AccessError(401, 'UNAUTHENTICATED');
  return { userId: data.user.id, email: data.user.email };
}

export async function GET() {
  try {
    const identity = await authenticatedEmail();
    const profile = await withSession(async (tx, actor) => {
      if (actor.userId !== identity.userId) throw new AccessError(401, 'UNAUTHENTICATED');
      const rows = await tx.$queryRaw<{ name: string; phone: string | null; role: string; state: string; municipality_id: string; version: number }[]>`
        SELECT name,phone,role,state,municipality_id,version
        FROM public.admin_profiles WHERE user_id=${actor.userId}::uuid
      `;
      const groups = await tx.$queryRaw<{ id: string; name: string }[]>`
        SELECT g.id::text AS id,g.name
        FROM public.user_group_memberships m JOIN public.groups g ON g.id=m.group_id
        WHERE m.user_id=${actor.userId}::uuid ORDER BY g.name,g.id
      `;
      const row = rows[0];
      if (!row) throw new AccessError(403, 'ACCESS_DENIED');
      return {
        userId: actor.userId,
        name: row.name,
        phone: row.phone,
        email: identity.email,
        role: row.role,
        state: row.state,
        municipalityId: row.municipality_id,
        version: row.version,
        groups,
        columns: await getColumns(tx, actor),
        availableColumns: availableColumns(actor.role !== 'CONSULTA'),
      };
    });
    return Response.json(profile, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const update = parseProfileUpdate(await readProfileUpdate(request));
    const saved = await withSession(async (tx, actor) => {
      const current = await tx.$queryRaw<{ name: string; phone: string | null }[]>`
        SELECT name,phone FROM public.admin_profiles
        WHERE user_id=${actor.userId}::uuid AND state='ATIVO' AND municipality_id=${actor.municipalityId}
      `;
      if (!current[0]) throw new AccessError(403, 'ACCESS_DENIED');
      if (current[0].name === update.name && current[0].phone === update.phone) return true;
      const rows = await tx.$queryRaw<{ user_id: string }[]>`
        UPDATE public.admin_profiles SET name=${update.name},phone=${update.phone}
        WHERE user_id=${actor.userId}::uuid AND state='ATIVO' AND municipality_id=${actor.municipalityId}
        RETURNING user_id::text AS user_id
      `;
      if (rows.length !== 1) throw new AccessError(403, 'ACCESS_DENIED');
      return true;
    });
    return Response.json({ saved }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof ProfileInputError) {
      return Response.json({ error: { code: 'INVALID_INPUT', message: 'Informe nome e telefone válidos.' } }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
    }
    return accessResponse(error);
  }
}
