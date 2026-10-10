import Link from 'next/link';
import { AccessError, requireCapability } from '@/server/access/context';
import { withSession } from '@/server/access/session';
import { GroupRosterManager, type GroupRosterData } from '@/features/access/ui/GroupRosterManager';

type Group = { id: string; name: string; isDefault: boolean };
type UserRow = { userId: string; name: string; phone: string | null; role: string; state: string; version: number };
type Membership = { userId: string; groupId: string };

export default async function GroupMembersPage({ searchParams }: { searchParams: Promise<{ groupId?: string | string[] }> }) {
  const params = await searchParams;
  const requestedId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  let roster: GroupRosterData | null = null;
  let error = '';

  try {
    roster = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      const [groups, userRows, memberships] = await Promise.all([
        tx.$queryRaw<Group[]>`SELECT id::text,name,is_default AS "isDefault" FROM public.groups WHERE municipality_id=${actor.municipalityId} ORDER BY is_default DESC,name,id`,
        tx.$queryRaw<UserRow[]>`SELECT user_id::text AS "userId",name,phone,role,state,version FROM public.admin_profiles WHERE municipality_id=${actor.municipalityId} ORDER BY lower(name),name,user_id`,
        tx.$queryRaw<Membership[]>`SELECT m.user_id::text AS "userId",m.group_id::text AS "groupId" FROM public.user_group_memberships m JOIN public.admin_profiles p ON p.user_id=m.user_id WHERE p.municipality_id=${actor.municipalityId}`,
      ]);
      const requested = requestedId ? groups.find((group) => group.id === requestedId) ?? null : groups[0] ?? null;
      return {
        groups,
        selectedGroupId: requested?.id ?? null,
        users: userRows.map((user) => ({ ...user, role: user.role as GroupRosterData['users'][number]['role'], state: user.state as GroupRosterData['users'][number]['state'], groupIds: memberships.filter((membership) => membership.userId === user.userId).map((membership) => membership.groupId) })),
        actorId: actor.userId,
        invalidGroup: Boolean(requestedId && !requested),
      };
    });
  } catch (cause) {
    error = cause instanceof AccessError && cause.status === 401
      ? 'Entre com uma conta administradora para continuar.'
      : cause instanceof AccessError && cause.status === 403
        ? 'Esta área está disponível somente para administradores ativos.'
        : 'Não foi possível carregar os grupos agora.';
  }

  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6" aria-labelledby="group-members-title">
    <header className="space-y-3">
      <Link href="/painel/admin" className="text-sm font-medium text-primary underline">← Voltar à Gestão municipal</Link>
      <div>
        <h1 id="group-members-title" className="text-2xl font-bold text-foreground">Pessoas por grupo</h1>
        <p className="mt-1 text-sm text-muted-foreground">Consulte e gerencie pessoas e vínculos dos grupos deste município.</p>
      </div>
    </header>
    {error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p> : roster && <GroupRosterManager initialData={roster} />}
  </main>;
}
