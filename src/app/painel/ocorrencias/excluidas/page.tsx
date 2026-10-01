'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface DeletedOccurrence {
  id: string;
  protocol: string;
  type: string;
  status: string;
  priority: string;
  group: { id: string; name: string };
  version: number;
  deletedAt: string;
}

interface DeletedPage {
  items: DeletedOccurrence[];
  page: number;
  pageSize: number;
  total: number;
}

export default function DeletedOccurrencesPage() {
  const [data, setData] = useState<DeletedPage | null>(null);
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/core/occurrences/deleted?page=${page}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as DeletedPage | { error?: { message?: string } };
        if (!response.ok) throw new Error('error' in payload ? payload.error?.message ?? 'Acesso negado.' : 'Não foi possível carregar as ocorrências.');
        setData(payload as DeletedPage);
        setError('');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar as ocorrências.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [page, refreshKey]);

  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.pageSize ?? 50)));

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" aria-labelledby="deleted-occurrences-title">
      <Link className="text-sm font-medium text-blue-300 hover:text-blue-200" href="/painel/ocorrencias">← Voltar para ocorrências</Link>
      <header>
        <h1 id="deleted-occurrences-title" className="text-2xl font-bold text-white">Ocorrências excluídas</h1>
        <p className="mt-2 text-sm text-slate-300">Visão administrativa. Os registros e as fotos permanecem preservados; restaurar exige justificativa.</p>
      </header>
      {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
      {loading ? <p role="status" className="text-slate-300">Carregando ocorrências…</p> : data && <>
        <p role="status" className="text-sm text-slate-300">{data.total} ocorrências excluídas · Página {page} de {pageCount}</p>
        {data.items.length ? <ul className="space-y-3">
          {data.items.map((item) => <li key={`${item.id}:${item.version}`}>
            <DeletedOccurrenceCard item={item} onRestored={() => setRefreshKey((current) => current + 1)} />
          </li>)}
        </ul> : <p className="rounded-lg border border-white/10 p-5 text-sm text-slate-300">Nenhuma ocorrência excluída.</p>}
        <nav aria-label="Paginação de ocorrências excluídas" className="flex items-center gap-4">
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">Página anterior</button>
          <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)} className="rounded border border-slate-600 px-3 py-2 text-sm text-slate-100 disabled:opacity-40">Próxima página</button>
        </nav>
      </>}
    </main>
  );
}

function DeletedOccurrenceCard({ item, onRestored }: { item: DeletedOccurrence; onRestored: () => void }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);

  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    setConflict(false);
    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(item.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: item.version, command: { kind: 'restore', reason: reason.trim() } }),
      });
      const result = await response.json() as { error?: { code?: string; message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Não foi possível restaurar. Atualize a lista e tente novamente.');
        setConflict(response.status === 409);
        return;
      }
      onRestored();
    } catch {
      setMessage('Falha de comunicação. Atualize a lista para confirmar o estado antes de tentar novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <article className="glass-card space-y-4 p-5" aria-label={`Ocorrência excluída ${item.protocol}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{item.protocol}</p>
          <h2 className="mt-1 text-lg font-semibold text-white">{item.type}</h2>
          <p className="mt-1 text-sm text-slate-300">{item.status} · Prioridade {item.priority} · Grupo {item.group.name}</p>
        </div>
        <time className="text-xs text-slate-400" dateTime={item.deletedAt}>Excluída em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date(item.deletedAt))}</time>
      </div>
      <form onSubmit={restore} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="space-y-1 text-sm text-slate-200">
          <span>Justificativa de restauração</span>
          <textarea required minLength={10} maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Restaurar</button>
      </form>
      {message && <p role={conflict ? 'alert' : 'status'} className="text-sm text-amber-100">{message}</p>}
    </article>
  );
}
