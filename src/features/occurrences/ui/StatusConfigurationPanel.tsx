'use client';

import { useEffect, useState } from 'react';
import type { Status } from '../contracts';
import type { StatusPresentationInput } from '../domain/status-configuration';

type Transition = { fromStatus: Status; toStatus: Status; enabled: boolean; roles: string[]; reasonRequired: boolean };
type Configuration = { presentations: StatusPresentationInput[]; transitions: Transition[] };
const labels: Record<string, string> = { NOVA: 'Nova', EM_TRIAGEM: 'Em triagem', EM_ATENDIMENTO: 'Em atendimento', RESOLVIDA: 'Resolvida', CANCELADA: 'Cancelada' };

export function StatusConfigurationPanel() {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let mounted = true;
    void fetch('/api/core/admin/status', { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar os status.');
      if (mounted) setConfiguration(body as Configuration);
    }).catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : 'Falha ao carregar.'); });
    return () => { mounted = false; };
  }, []);

  async function save(action: string, values: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/core/admin/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...values }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível salvar a configuração.');
      setMessage('Configuração salva e auditada. Ela vale para as próximas operações.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }

  if (!configuration) return <main className="space-y-4 p-6"><h1 className="text-2xl font-bold text-white">Configuração de status</h1>{error ? <p role="alert" className="text-red-200">{error}</p> : <p role="status" className="text-slate-300">Carregando configurações…</p>}</main>;
  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6" aria-labelledby="status-config-title">
    <header><h1 id="status-config-title" className="text-2xl font-bold text-white">Configurar transições e rótulos</h1><p className="mt-1 text-sm text-slate-300">Os códigos internos e as capacidades de cada papel são fixos. Mudanças afetam somente novas operações.</p></header>
    {error && <p role="alert" className="rounded border border-red-400/30 bg-red-500/10 p-3 text-red-100">{error}</p>}
    {message && <p role="status" className="rounded border border-emerald-400/30 bg-emerald-500/10 p-3 text-emerald-100">{message}</p>}
    <section className="glass-card space-y-4 p-5" aria-labelledby="presentation-title">
      <h2 id="presentation-title" className="text-lg font-semibold text-white">Rótulos e ordem</h2>
      <div className="space-y-3">{configuration.presentations.map((item) => <div key={item.code} className="grid gap-3 sm:grid-cols-[1fr_2fr_6rem]">
        <label className="space-y-1 text-sm text-slate-200"><span>Código imutável</span><input readOnly value={`${item.code} · ${labels[item.code]}`} className="w-full rounded bg-slate-950 p-2 text-slate-400"/></label>
        <label className="space-y-1 text-sm text-slate-200"><span>Rótulo exibido</span><input maxLength={40} value={item.label} onChange={(event) => setConfiguration((current) => current && ({ ...current, presentations: current.presentations.map((candidate) => candidate.code === item.code ? { ...candidate, label: event.target.value } : candidate) }))} className="w-full rounded bg-slate-950 p-2"/></label>
        <label className="space-y-1 text-sm text-slate-200"><span>Ordem</span><input type="number" min={1} max={5} value={item.displayOrder} onChange={(event) => setConfiguration((current) => current && ({ ...current, presentations: current.presentations.map((candidate) => candidate.code === item.code ? { ...candidate, displayOrder: Number(event.target.value) } : candidate) }))} className="w-full rounded bg-slate-950 p-2"/></label>
      </div>)}</div>
      <button disabled={busy} onClick={() => void save('presentations', { items: configuration.presentations })} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar rótulos e ordem</button>
    </section>
    <section className="glass-card space-y-4 p-5" aria-labelledby="transitions-title">
      <h2 id="transitions-title" className="text-lg font-semibold text-white">Transições permitidas</h2>
      <ul className="space-y-2">{configuration.transitions.map((transition) => <li key={`${transition.fromStatus}-${transition.toStatus}`} className="flex flex-wrap items-center justify-between gap-3 rounded border border-slate-700 p-3">
        <div><p className="text-sm font-medium text-white">{labels[transition.fromStatus]} → {labels[transition.toStatus]}</p><p className="text-xs text-slate-400">Papéis fixos: {transition.roles.join(', ') || 'nenhum'}{transition.reasonRequired ? ' · justificativa obrigatória' : ''}</p></div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" checked={transition.enabled} disabled={busy} onChange={(event) => setConfiguration((current) => current && ({ ...current, transitions: current.transitions.map((candidate) => candidate.fromStatus === transition.fromStatus && candidate.toStatus === transition.toStatus ? { ...candidate, enabled: event.target.checked } : candidate) }))}/>{transition.enabled ? 'Habilitada' : 'Desabilitada'}</label>
        <button disabled={busy} onClick={() => void save('transition', { fromStatus: transition.fromStatus, toStatus: transition.toStatus, enabled: transition.enabled })} className="rounded border border-slate-600 px-3 py-1 text-sm text-white disabled:opacity-50">Salvar transição</button>
      </li>)}</ul>
      <p className="text-xs text-slate-400">Papéis e justificativas não são editáveis nesta tela. Reabertura e reclassificação continuam protegidas pelas capacidades atuais.</p>
    </section>
  </main>;
}
