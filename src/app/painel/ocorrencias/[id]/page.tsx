'use client';

import Link from 'next/link';
import { use } from 'react';
import { useEffect, useState } from 'react';
import {OccurrencePhoto} from '@/features/occurrences/ui/OccurrencePhoto';
import type { Priority, Status } from '@/features/occurrences/contracts';

interface OccurrenceDetail {
  id: string;
  protocol: string;
  type: string;
  description: string | null;
  status: { code: Status; label: string };
  priority: Priority;
  group: { id: string; name: string };
  position: { latitude: number; longitude: number; accuracy: number | null } | null;
  openedAt: string;
  updatedAt: string;
  version: number;
  classification: { zones: { id: string; name: string; version: number }[] } | null;
  events: { id: string; kind: string; actorId: string | null; at: string }[];
  privateData?: {hasPhoto: boolean};
  actions: { canOperate: boolean; canReclassify: boolean; availableTransitions: {target: Status; reasonRequired: boolean}[] };
  availableGroups: { id: string; name: string }[];
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(value));
}

function formatCoordinate(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 6 }).format(value);
}

export default function OccurrenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OccurrenceDetailView key={id} id={id} />;
}

function OccurrenceDetailView({id}: {id: string}) {
  const [detail, setDetail] = useState<OccurrenceDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/core/occurrences/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Occurrence unavailable');
        return await response.json() as OccurrenceDetail;
      })
      .then(setDetail)
      .catch(() => {
        if (!controller.signal.aborted) setDetail(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  async function reloadDetail() {
    const response = await fetch(`/api/core/occurrences/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) return false;
    setDetail(await response.json() as OccurrenceDetail);
    return true;
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-5xl p-4 text-slate-300" role="status">Carregando ocorrência…</main>;
  }

  if (!detail) {
    return (
      <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" aria-labelledby="occurrence-unavailable-title">
        <Link className="text-sm font-medium text-blue-300 hover:text-blue-200" href="/painel">← Voltar para ocorrências</Link>
        <section className="glass-card p-6 sm:p-8">
          <h1 id="occurrence-unavailable-title" className="text-xl font-bold text-white">Ocorrência indisponível</h1>
          <p className="mt-2 text-sm text-slate-300">Não foi possível localizar esta ocorrência ou você não tem acesso a ela.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" aria-labelledby="occurrence-detail-title">
      <Link className="text-sm font-medium text-blue-300 hover:text-blue-200" href="/painel">← Voltar para ocorrências</Link>
      <header className="glass-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Protocolo {detail.protocol}</p>
        <h1 id="occurrence-detail-title" className="mt-2 text-2xl font-bold text-white">Detalhe da ocorrência</h1>
        <p className="mt-2 text-sm text-slate-300">{detail.type} · {detail.status.label} · Prioridade {detail.priority}</p>
      </header>

      {detail.actions.canOperate && <OccurrenceMutationControls key={`${detail.id}:${detail.version}`} detail={detail} onReload={reloadDetail} />}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-summary-title">
        <h2 id="occurrence-summary-title" className="text-lg font-semibold text-white">Resumo</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo</dt><dd className="mt-1 text-sm text-slate-100">{detail.type}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 text-sm text-slate-100">{detail.status.label}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioridade</dt><dd className="mt-1 text-sm text-slate-100">{detail.priority}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grupo</dt><dd className="mt-1 text-sm text-slate-100">{detail.group.name}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descrição</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{detail.description || 'Sem descrição informada.'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abertura</dt><dd className="mt-1 text-sm text-slate-100">{formatDate(detail.openedAt)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última atualização</dt><dd className="mt-1 text-sm text-slate-100">{formatDate(detail.updatedAt)}</dd></div>
        </dl>
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-location-title">
        <h2 id="occurrence-location-title" className="text-lg font-semibold text-white">Localização</h2>
        {detail.position ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
            <p>Latitude: {formatCoordinate(detail.position.latitude)}</p>
            <p>Longitude: {formatCoordinate(detail.position.longitude)}</p>
            <p>Precisão: {detail.position.accuracy === null ? 'Indisponível' : `${formatCoordinate(detail.position.accuracy)} m`}</p>
          </div>
        ) : <p className="mt-3 text-sm text-slate-300">Localização indisponível</p>}
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-classification-title">
        <h2 id="occurrence-classification-title" className="text-lg font-semibold text-white">Classificação na abertura</h2>
        {detail.classification?.zones.length ? (
          <ul className="mt-4 space-y-2 text-sm text-slate-100">
            {detail.classification.zones.map((zone) => (
              <li key={`${zone.id}:${zone.version}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span>{zone.name}</span><span className="text-slate-400">Versão {zone.version}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-slate-300">Nenhuma zona registrada na abertura.</p>}
      </section>

      {detail.privateData?.hasPhoto && <section className="glass-card p-5 sm:p-7">
        <OccurrencePhoto occurrenceId={detail.id} />
      </section>}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-history-title">
        <h2 id="occurrence-history-title" className="text-lg font-semibold text-white">Histórico</h2>
        {detail.events.length ? (
          <ol aria-label="Histórico" className="mt-4 space-y-0 border-l border-white/10 pl-5">
            {detail.events.map((event) => (
              <li key={event.id} className="relative border-b border-white/5 py-3 last:border-b-0">
                <span aria-hidden="true" className="absolute -left-[1.58rem] top-4 h-2 w-2 rounded-full bg-blue-400" />
                <p className="text-sm font-medium text-slate-100">{event.kind.replaceAll('_', ' ')}</p>
                <time className="mt-1 block text-xs text-slate-400" dateTime={event.at}>{formatDate(event.at)}</time>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-300">Nenhum evento registrado.</p>}
      </section>
    </main>
  );
}

const statusLabels: Record<Status, string> = {
  NOVA: 'Nova',
  EM_TRIAGEM: 'Em triagem',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

function OccurrenceMutationControls({
  detail,
  onReload,
}: {
  detail: OccurrenceDetail;
  onReload: () => Promise<boolean>;
}) {
  const [type, setType] = useState(detail.type);
  const [description, setDescription] = useState(detail.description ?? '');
  const [groupId, setGroupId] = useState(detail.group.id);
  const [reason, setReason] = useState('');
  const [priority, setPriority] = useState<Priority>(detail.priority);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);

  async function submit(command: Record<string, unknown>) {
    setSaving(true);
    setMessage('');
    setConflict(false);
    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: detail.version, command }),
      });
      const result = await response.json() as { error?: { code?: string; message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Não foi possível salvar a alteração.');
        setConflict(response.status === 409);
        return;
      }
      const refreshed = await onReload();
      setMessage(refreshed ? 'Alteração salva.' : 'Alteração salva. Atualize o detalhe para ver o estado atual.');
    } catch {
      setMessage('Falha de comunicação. Verifique o estado atual antes de tentar novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = {
      kind: 'edit',
      ...(type.trim() !== detail.type ? { type: type.trim() } : {}),
      ...(description.trim() !== (detail.description ?? '') ? { description: description.trim() } : {}),
      ...(groupId !== detail.group.id ? { groupId } : {}),
    };
    if (Object.keys(command).length === 1) {
      setMessage('Faça ao menos uma alteração antes de salvar.');
      return;
    }
    await submit(command);
  }

  async function reloadAfterConflict() {
    setSaving(true);
    try {
      const refreshed = await onReload();
      setConflict(false);
      setMessage(refreshed ? 'Estado atual carregado. Confira os valores antes de salvar novamente.' : 'Não foi possível atualizar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card space-y-5 p-5 sm:p-7" aria-labelledby="occurrence-mutation-title">
      <div>
        <h2 id="occurrence-mutation-title" className="text-lg font-semibold text-white">Editar e atualizar ocorrência</h2>
        <p className="mt-1 text-xs text-slate-400">Versão {detail.version}. Alterações concorrentes exigem atualização antes de salvar novamente.</p>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitEdit}>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Tipo</span>
          <input required maxLength={80} value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Grupo responsável</span>
          <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            {detail.availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-200 sm:col-span-2">
          <span>Descrição</span>
          <textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar edição</button>
      </form>

      {detail.actions.availableTransitions.length > 0 && <div className="space-y-3 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Transições disponíveis</h3>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Justificativa (quando exigida pela regra)</span>
          <textarea maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <div className="flex flex-wrap gap-2">
          {detail.actions.availableTransitions.map((transition) => (
            <button key={transition.target} type="button" disabled={saving} onClick={() => void submit({ kind: 'transition', target: transition.target, ...(reason.trim() ? { reason: reason.trim() } : {}) })} className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-50">
              {statusLabels[transition.target]}{transition.reasonRequired ? ' · justificativa obrigatória' : ''}
            </button>
          ))}
        </div>
      </div>}

      {detail.actions.canReclassify && <div className="space-y-3 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Reclassificar prioridade</h3>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Nova prioridade</span>
          <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            <option value="NORMAL">Normal</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Justificativa obrigatória</span>
          <textarea required minLength={10} maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="button" disabled={saving} onClick={() => void submit({ kind: 'reclassify', priority, reason: reason.trim() })} className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-50">Salvar prioridade</button>
      </div>}


      {message && <p role={conflict ? 'alert' : 'status'} className={conflict ? 'text-sm text-amber-200' : 'text-sm text-slate-200'}>{message}</p>}
      {conflict && <button type="button" disabled={saving} onClick={() => void reloadAfterConflict()} className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-100 disabled:opacity-50">Atualizar estado atual</button>}
    </section>
  );
}
