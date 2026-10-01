import { AdminInputError, parseCreateManagedUser, parseManagedGroup, parseUpdateManagedUser } from '@/features/access/domain/admin';
import { provisionPendingUser } from '@/features/access/application/admin';
import { accessResponse, withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import { AdminAuthConfigurationError, createProvisioningLink, ensureAuthUser } from '@/server/access/admin-auth';
import type { Prisma } from '../../../../../prisma/generated/client/client';

export const dynamic = 'force-dynamic';
const municipalityId = 'sa_patrulha';

function requireAdmin(actor: Parameters<typeof requireCapability>[0]) {
  requireCapability(actor, 'administer');
}

async function assertGroups(tx: Prisma.TransactionClient, groupIds: string[]) {
  if (!groupIds.length) return;
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM public.groups WHERE municipality_id=${municipalityId} AND id=ANY(${groupIds}::uuid[])`;
  if (rows.length !== groupIds.length) throw new AdminInputError();
}

async function replaceMemberships(tx: Prisma.TransactionClient, userId: string, groupIds: string[]) {
  await tx.$executeRaw`DELETE FROM public.user_group_memberships WHERE user_id=${userId}::uuid`;
  for (const groupId of groupIds) {
    await tx.$executeRaw`INSERT INTO public.user_group_memberships(user_id,group_id) VALUES(${userId}::uuid,${groupId}::uuid)`;
  }
}

export async function GET() {
  try {
    const data = await withSession(async (tx, actor) => {
      requireAdmin(actor);
      const [users, groups, memberships] = await Promise.all([
        tx.$queryRaw<{ user_id: string; name: string; phone: string | null; role: string; state: string; version: number }[]>`SELECT user_id,name,phone,role,state,version FROM public.admin_profiles WHERE municipality_id=${municipalityId} ORDER BY name,user_id`,
        tx.$queryRaw<{ id: string; name: string; is_default: boolean }[]>`SELECT id,name,is_default FROM public.groups WHERE municipality_id=${municipalityId} ORDER BY is_default DESC,name`,
        tx.$queryRaw<{ user_id: string; group_id: string }[]>`SELECT m.user_id,m.group_id FROM public.user_group_memberships m JOIN public.admin_profiles p ON p.user_id=m.user_id WHERE p.municipality_id=${municipalityId}`,
      ]);
      return {
        users: users.map((user) => ({ userId: user.user_id, name: user.name, phone: user.phone, role: user.role, state: user.state, version: user.version, groupIds: memberships.filter((membership) => membership.user_id === user.user_id).map((membership) => membership.group_id) })),
        groups: groups.map((group) => ({ id: group.id, name: group.name, isDefault: group.is_default })),
        actorId: actor.userId,
      };
    });
    return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return adminResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new AdminInputError(); }
    if (typeof body !== 'object' || body === null || Array.isArray(body) || typeof (body as { action?: unknown }).action !== 'string') throw new AdminInputError();
    const input = body as Record<string, unknown>;
    if (input.action === 'create_user') {
      if (Object.keys(input).some((key) => !['action','email','name','phone','role','groupIds'].includes(key))) throw new AdminInputError();
      const user = parseCreateManagedUser({ email: input.email, name: input.name, phone: input.phone, role: input.role, groupIds: input.groupIds });
      await withSession(async (tx, actor) => { requireAdmin(actor); await assertGroups(tx, user.groupIds); });
      const result = await provisionPendingUser(user, {
        ensureAuthUser,
        createLink: createProvisioningLink,
        async savePending(userId, details, authRetry) {
          await withSession(async (tx, actor) => {
            requireAdmin(actor);
            await assertGroups(tx, details.groupIds);
            const existing = await tx.$queryRaw<{ state: string }[]>`SELECT state FROM public.admin_profiles WHERE user_id=${userId}::uuid`;
            if (existing[0] && existing[0].state !== 'PENDENTE') throw new AccessError(403, 'ACCESS_DENIED');
            await tx.$executeRaw`INSERT INTO public.admin_profiles(user_id,municipality_id,name,phone,role,state) VALUES(${userId}::uuid,${municipalityId},${details.name},${details.phone},${details.role},'PENDENTE') ON CONFLICT(user_id) DO UPDATE SET name=EXCLUDED.name,phone=EXCLUDED.phone,role=EXCLUDED.role WHERE public.admin_profiles.state='PENDENTE' AND public.admin_profiles.municipality_id=${municipalityId}`;
            const saved = await tx.$queryRaw<{ user_id: string }[]>`SELECT user_id FROM public.admin_profiles WHERE user_id=${userId}::uuid AND state='PENDENTE' AND municipality_id=${municipalityId}`;
            if (!saved[0]) throw new AccessError(403, 'ACCESS_DENIED');
            await replaceMemberships(tx, userId, details.groupIds);
            const kind = existing[0] || authRetry ? 'ADMIN_USER_PROVISIONING_RETRIED' : 'ADMIN_USER_PROVISIONED';
            const changes = JSON.stringify({ email: details.email, role: details.role, groupIds: details.groupIds, state: 'PENDENTE' });
            await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${userId}::uuid,${kind},'Provisionamento administrativo',${changes}::jsonb)`;
          });
        },
      });
      return Response.json(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
    }

    if (input.action === 'update_user') {
      if (Object.keys(input).some((key) => !['action','userId','role','state','groupIds'].includes(key))) throw new AdminInputError();
      const update = parseUpdateManagedUser({ userId: input.userId, role: input.role, state: input.state, groupIds: input.groupIds });
      await withSession(async (tx, actor) => {
        requireAdmin(actor);
        if (update.userId === actor.userId) throw new AccessError(403, 'ACCESS_DENIED');
        await assertGroups(tx, update.groupIds);
        const current = await tx.$queryRaw<{ user_id: string }[]>`SELECT user_id FROM public.admin_profiles WHERE user_id=${update.userId}::uuid AND municipality_id=${municipalityId}`;
        if (!current[0]) throw new AccessError(404, 'NOT_FOUND');
        await tx.$executeRaw`UPDATE public.admin_profiles SET role=${update.role},state=${update.state} WHERE user_id=${update.userId}::uuid AND municipality_id=${municipalityId}`;
        await replaceMemberships(tx, update.userId, update.groupIds);
        const changes = JSON.stringify({ role: update.role, state: update.state, groupIds: update.groupIds });
        await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${update.userId}::uuid,'ADMIN_USER_ACCESS_UPDATED','Alteração administrativa de acesso',${changes}::jsonb)`;
      });
      return Response.json({ updated: true });
    }

    if (input.action === 'create_group' || input.action === 'update_group') {
      if (Object.keys(input).some((key) => !['action','id','name','isDefault'].includes(key)) || (input.action === 'create_group' && input.id !== undefined) || (input.action === 'update_group' && input.id === undefined)) throw new AdminInputError();
      const group = parseManagedGroup({ ...(input.id === undefined ? {} : { id: input.id }), name: input.name, isDefault: input.isDefault });
      const result = await withSession(async (tx, actor) => {
        requireAdmin(actor);
        if (group.isDefault) await tx.$executeRaw`UPDATE public.groups SET is_default=false WHERE municipality_id=${municipalityId} AND is_default=true AND id IS DISTINCT FROM ${group.id ?? null}::uuid`;
        const rows = group.id
          ? await tx.$queryRaw<{ id: string }[]>`UPDATE public.groups SET name=${group.name},is_default=${group.isDefault} WHERE id=${group.id}::uuid AND municipality_id=${municipalityId} RETURNING id`
          : await tx.$queryRaw<{ id: string }[]>`INSERT INTO public.groups(municipality_id,name,is_default) VALUES(${municipalityId},${group.name},${group.isDefault}) RETURNING id`;
        if (!rows[0]) throw new AccessError(404, 'NOT_FOUND');
        const kind = group.id ? 'ADMIN_GROUP_UPDATED' : 'ADMIN_GROUP_CREATED';
        const changes = JSON.stringify({ name: group.name, isDefault: group.isDefault });
        await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actor.userId}::uuid,${rows[0].id}::uuid,${kind},'Alteração administrativa de grupo',${changes}::jsonb)`;
        return rows[0].id;
      });
      return Response.json({ id: result }, { status: input.action === 'create_group' ? 201 : 200 });
    }
    throw new AdminInputError();
  } catch (error) {
    return adminResponse(error);
  }
}

function adminResponse(error: unknown) {
  if (error instanceof AdminInputError) return Response.json({ error: { code: error.message, message: 'Verifique os dados informados.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
  if (error instanceof AdminAuthConfigurationError) return Response.json({ error: { code: error.message, message: 'Provisionamento Auth indisponível: configure SUPABASE_SERVICE_ROLE_KEY no .env da raiz.' } }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  return accessResponse(error);
}
