import 'server-only';
import type { Prisma } from '../../../prisma/generated/client/client';
import type { Actor } from '@/features/access/contracts';
import { canEnterPanel, can, type Capability } from '@/features/access/domain/permissions';
import { prisma } from '../database/prisma';

export class AccessError extends Error {
  constructor(public status: 401 | 403 | 404, public code: string) { super(code); }
}
export const municipalityId = 'sa_patrulha';
export async function withIdentity<T>(userId: string, work: (tx: Prisma.TransactionClient, actor: Actor) => Promise<T>): Promise<T> {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) throw new AccessError(401,'UNAUTHENTICATED');
  return prisma.$transaction(async tx => {
    const roles = await tx.$queryRaw<{safe:boolean}[]>`SELECT NOT r.rolsuper AND NOT r.rolbypassrls AND NOT login.rolsuper AND NOT login.rolbypassrls AND r.rolname='geoalerta_runtime' AND NOT EXISTS(SELECT FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname='occurrences' AND c.relowner IN(r.oid,login.oid)) AS safe FROM pg_roles r JOIN pg_roles login ON login.rolname=session_user WHERE r.rolname=current_user`;
    if (!roles[0]?.safe) throw new Error('Core requires a restricted geoalerta_runtime connection.');
    await tx.$queryRaw`SELECT set_config('request.jwt.claim.sub',${userId},true), set_config('request.jwt.claims',${JSON.stringify({sub:userId})},true)`;
    const profiles = await tx.$queryRaw<{user_id:string;role:Actor['role'];state:Actor['state'];municipality_id:string}[]>`SELECT user_id,role,state,municipality_id FROM public.admin_profiles WHERE user_id=${userId}::uuid`;
    const profile=profiles[0];
    if (!profile) throw new AccessError(403,'ACCESS_DENIED');
    const memberships=await tx.$queryRaw<{group_id:string}[]>`SELECT group_id FROM public.user_group_memberships WHERE user_id=${userId}::uuid`;
    const actor: Actor={userId,role:profile.role,state:profile.state,municipalityId:profile.municipality_id,groupIds:memberships.map(m=>m.group_id)};
    if (!canEnterPanel(actor) || actor.municipalityId!==municipalityId) throw new AccessError(403,'ACCESS_DENIED');
    return work(tx,actor);
  },{maxWait:5_000,timeout:5_000});
}
export function requireCapability(actor: Actor, capability: Capability, groupId?: string) {
  if (!can(actor,capability,{municipalityId,groupId:groupId ?? actor.groupIds[0]})) throw new AccessError(403,'ACCESS_DENIED');
}
