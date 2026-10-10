import Link from 'next/link';
import { AccessError, requireCapability } from '@/server/access/context';
import { withSession } from '@/server/access/session';
import { parseAuditCursor } from '@/features/audit/application/pagination';
import { auditActionLabel, auditActionTarget, formatAuditActor } from '@/features/audit/application/presentation';

const PAGE_SIZE = 50;

type AuditEvent = {
  id: string;
  actorId: string | null;
  entityId: string;
  kind: string;
  at: Date;
};

type AuditPageProps = {
  searchParams: Promise<{ beforeAt?: string | string[]; beforeId?: string | string[] }>;
};

export default async function AuditPage({ searchParams }: AuditPageProps) {
  const params = await searchParams;
  let cursor;
  try {
    cursor = parseAuditCursor(params.beforeAt, params.beforeId);
  } catch {
    return <main className="mx-auto w-full max-w-6xl space-y-4 p-4 sm:p-6" aria-labelledby="audit-title"><h1 id="audit-title" className="text-2xl font-bold text-foreground">Trilha de auditoria</h1><p role="alert" className="text-danger">O marcador de paginação é inválido. Volte à primeira página.</p><Link className="text-primary underline" href="/painel/admin/auditoria">Ver eventos recentes</Link></main>;
  }

  let events: AuditEvent[] = [];
  let hasMore = false;
  let error = '';
  try {
    const page = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      const rows = cursor
        ? await tx.$queryRaw<AuditEvent[]>`SELECT id::text,actor_id::text AS "actorId",entity_id::text AS "entityId",kind,at FROM public.audit_events WHERE (at,id)<(${cursor.at}::timestamptz,${cursor.id}::uuid) ORDER BY at DESC,id DESC LIMIT ${PAGE_SIZE + 1}`
        : await tx.$queryRaw<AuditEvent[]>`SELECT id::text,actor_id::text AS "actorId",entity_id::text AS "entityId",kind,at FROM public.audit_events ORDER BY at DESC,id DESC LIMIT ${PAGE_SIZE + 1}`;
      return { events: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE };
    });
    events = page.events;
    hasMore = page.hasMore;
  } catch (cause) {
    error = cause instanceof AccessError && cause.status === 401
      ? 'Entre com uma conta administradora para continuar.'
      : cause instanceof AccessError && cause.status === 403
        ? 'Esta área está disponível somente para administradores ativos deste município.'
        : 'Não foi possível carregar a trilha de auditoria agora.';
  }

  const last = events.at(-1);
  const nextHref = hasMore && last
    ? `/painel/admin/auditoria?${new URLSearchParams({ beforeAt: last.at.toISOString(), beforeId: last.id })}`
    : null;

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6" aria-labelledby="audit-title">
    <header>
      <h1 id="audit-title" className="text-2xl font-bold text-foreground">Trilha de auditoria</h1>
      <p className="mt-1 text-sm text-muted-foreground">Eventos do município ativo, em ordem cronológica inversa. Os detalhes pessoais e payloads completos ficam ocultos.</p>
      <Link className="mt-3 inline-flex text-sm text-primary underline" href="/painel/admin">Voltar à Gestão municipal</Link>
    </header>
    {error ? <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p> : events.length ? <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[44rem] text-left text-sm">
          <caption className="sr-only">Eventos recentes de auditoria do município</caption>
          <thead><tr className="bg-surface-subtle text-foreground"><th className="p-3">Ator</th><th className="p-3">Ação</th><th className="p-3">Alvo</th><th className="p-3">Horário</th><th className="p-3">Resultado</th></tr></thead>
          <tbody>{events.map((event) => <tr key={event.id} className="border-t border-border text-foreground">
            <td className="p-3 font-mono text-xs" title={event.actorId ?? 'Sistema'}>{formatAuditActor(event.actorId)}</td>
            <td className="p-3">{auditActionLabel(event.kind)}</td>
            <td className="p-3"><span>{auditActionTarget(event.kind)}</span><span className="ml-2 font-mono text-xs text-muted-foreground" title={event.entityId}>{formatAuditActor(event.entityId)}</span></td>
            <td className="p-3 tabular-nums">{event.at.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium', timeZone: 'America/Sao_Paulo' })}</td>
            <td className="p-3">Alteração persistida</td>
          </tr>)}</tbody>
        </table>
      </div>
      {nextHref && <nav aria-label="Paginação da auditoria"><Link className="inline-flex rounded border border-control-border px-3 py-2 text-sm text-primary" href={nextHref}>Eventos anteriores</Link></nav>}
    </> : <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Nenhum evento de auditoria encontrado neste recorte.</p>}
  </main>;
}
