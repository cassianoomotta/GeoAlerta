'use client';

import Link from 'next/link';
import { use } from 'react';
import { useEffect, useState } from 'react';
import {OccurrencePhoto} from '@/features/occurrences/ui/OccurrencePhoto';

interface OccurrenceDetail {
  id: string;
  protocol: string;
  type: string;
  description: string | null;
  status: { code: string; label: string };
  priority: string;
  group: { id: string; name: string };
  position: { latitude: number; longitude: number; accuracy: number | null } | null;
  openedAt: string;
  updatedAt: string;
  version: number;
  classification: { zones: { id: string; name: string; version: number }[] } | null;
  events: { id: string; kind: string; actorId: string | null; at: string }[];
  privateData?: {hasPhoto: boolean};
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
