import { accessResponse, withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import { parseStatusPresentations, parseTransitionInput, StatusConfigurationInputError } from '@/features/occurrences/domain/status-configuration';
import { configureStatusPresentations, configureStatusTransition } from '@/features/occurrences/application/configure-status';
import type { Prisma } from '../../../../../../prisma/generated/client/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      const [presentations, transitions] = await Promise.all([
        tx.$queryRaw<{ code: string; label: string; display_order: number }[]>`SELECT code,label,display_order FROM public.status_presentations ORDER BY display_order,code`,
        tx.$queryRaw<{ from_status: string; to_status: string; enabled: boolean; roles: unknown; reason_required: boolean }[]>`SELECT from_status,to_status,enabled,roles,reason_required FROM public.status_transitions ORDER BY from_status,to_status`,
      ]);
      return {
        presentations: presentations.map((row) => ({ code: row.code, label: row.label, displayOrder: row.display_order })),
        transitions: transitions.map((row) => ({ fromStatus: row.from_status, toStatus: row.to_status, enabled: row.enabled, roles: row.roles, reasonRequired: row.reason_required })),
      };
    });
    return Response.json(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return accessResponse(error);
  }
}

async function savePresentations(tx: Prisma.TransactionClient, actorId: string, presentations: ReturnType<typeof parseStatusPresentations>) {
  const locked = await tx.$queryRaw<{ code: string }[]>`SELECT code FROM public.status_presentations ORDER BY code FOR UPDATE`;
  if (locked.length !== presentations.length || presentations.some((item) => !locked.some((row) => row.code === item.code))) throw new Error('STATUS_CONFIGURATION_INCOMPLETE');
  for (const item of presentations) {
    const updated = await tx.$executeRaw`UPDATE public.status_presentations SET label=${item.label},display_order=${item.displayOrder} WHERE code=${item.code}`;
    if (updated !== 1) throw new Error('STATUS_CONFIGURATION_INCOMPLETE');
  }
  const changes = JSON.stringify(presentations);
  await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actorId}::uuid,gen_random_uuid(),'ADMIN_STATUS_PRESENTATIONS_UPDATED','Atualização de rótulos e ordem dos estados',${changes}::jsonb)`;
}

async function saveTransition(tx: Prisma.TransactionClient, actorId: string, update: ReturnType<typeof parseTransitionInput>) {
  const rows = await tx.$queryRaw<{ enabled: boolean }[]>`UPDATE public.status_transitions SET enabled=${update.enabled} WHERE from_status=${update.fromStatus} AND to_status=${update.toStatus} RETURNING enabled`;
  if (!rows[0]) throw new AccessError(404, 'NOT_FOUND');
  const changes = JSON.stringify({ fromStatus: update.fromStatus, toStatus: update.toStatus, enabled: update.enabled });
  await tx.$executeRaw`INSERT INTO public.audit_events(actor_id,entity_id,kind,reason,changes) VALUES(${actorId}::uuid,gen_random_uuid(),'ADMIN_STATUS_TRANSITION_UPDATED','Atualização de transição de estado',${changes}::jsonb)`;
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); } catch { throw new StatusConfigurationInputError(); }
    if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new StatusConfigurationInputError();
    const input = body as Record<string, unknown>;
    if (input.action === 'presentations') {
      if (Object.keys(input).some((key) => !['action','items'].includes(key))) throw new StatusConfigurationInputError();
      await configureStatusPresentations(input.items, (presentations) => withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        await savePresentations(tx, actor.userId, presentations);
      }));
      return Response.json({ saved: true });
    }
    if (input.action === 'transition') {
      if (Object.keys(input).some((key) => !['action','fromStatus','toStatus','enabled'].includes(key))) throw new StatusConfigurationInputError();
      await configureStatusTransition({ fromStatus: input.fromStatus, toStatus: input.toStatus, enabled: input.enabled }, (update) => withSession(async (tx, actor) => {
        requireCapability(actor, 'administer');
        await saveTransition(tx, actor.userId, update);
      }));
      return Response.json({ saved: true });
    }
    throw new StatusConfigurationInputError();
  } catch (error) {
    if (error instanceof StatusConfigurationInputError) return Response.json({ error: { code: error.message, message: 'Os códigos dos estados são fixos; revise rótulos, ordem e transição.' } }, { status: 400, headers: { 'Cache-Control': 'no-store' } });
    return accessResponse(error);
  }
}
