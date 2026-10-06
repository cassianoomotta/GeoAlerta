'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { ClimateEvent, ClimateEventState } from '../contracts';

type EventItem = ClimateEvent & { occurrences: { id: string; protocol: string; status: string }[] };
const states: Record<ClimateEventState, string> = { PLANEJADO: 'Planejado', EM_ANDAMENTO: 'Em andamento', ENCERRADO: 'Encerrado' };

export function ClimateEventAdminPanel() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [name, setName] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const response = await fetch('/api/core/climate-events', { cache: 'no-store' });
    if (!response.ok) throw new Error('Não foi possível carregar os eventos.');
    const data = await response.json() as { events: EventItem[] };
    setEvents(data.events);
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/core/climate-events', { cache: 'no-store' })
      .then(async response => { if (!response.ok) throw new Error(); return await response.json() as { events: EventItem[] }; })
      .then(data => { if (active) setEvents(data.events); })
      .catch(() => { if (active) setMessage('Não foi possível carregar os eventos. Tente novamente.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function send(command: Record<string, unknown>, success: string) {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/core/climate-events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command) });
      const data = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(data.error?.message ?? 'Não foi possível salvar o evento.');
      await refresh(); setMessage(success); setEditing(null);
      return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Não foi possível salvar o evento.'); return false; }
    finally { setBusy(false); }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await send({ action: 'create', name, plannedStart, plannedEnd }, 'Evento cadastrado como planejado.')) {
      setName(''); setPlannedStart(''); setPlannedEnd('');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>, item: EventItem) {
    event.preventDefault();
    await send({ action: 'update', id: item.id, expectedVersion: item.version, name: editName, plannedStart: editStart, plannedEnd: editEnd }, 'Evento atualizado.');
  }

  async function transition(item: EventItem, action: 'start' | 'close') {
    const confirmText = action === 'start' ? `Iniciar o evento “${item.name}”?` : `Encerrar o evento “${item.name}”?`;
    if (!window.confirm(confirmText)) return;
    await send({ action, id: item.id, expectedVersion: item.version }, action === 'start' ? 'Evento iniciado.' : 'Evento encerrado.');
  }

  return <main className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6" aria-labelledby="climate-events-title">
    <header><h1 id="climate-events-title" className="text-2xl font-bold">Gestão de eventos climáticos</h1><p className="mt-2 text-sm text-muted-foreground">Cadastre e acompanhe eventos municipais. Datas previstas usam o calendário local de Santo Antônio da Patrulha.</p></header>
    <form onSubmit={create} className="glass-card grid gap-4 p-5 sm:grid-cols-2" aria-label="Cadastrar evento climático">
      <h2 className="text-lg font-semibold sm:col-span-2">Novo evento</h2>
      <label className="sm:col-span-2">Nome<input required minLength={1} maxLength={120} value={name} onChange={event => setName(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
      <label>Início previsto<input required type="date" value={plannedStart} onChange={event => setPlannedStart(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
      <label>Fim previsto<input required type="date" min={plannedStart || undefined} value={plannedEnd} onChange={event => setPlannedEnd(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
      <button disabled={busy} className="btn btn-primary sm:col-span-2">Cadastrar como planejado</button>
    </form>

    {message && <p role="status" aria-live="polite" className="rounded border border-control-border p-3 text-sm">{message}</p>}
    <section aria-labelledby="climate-event-list-title" className="space-y-4">
      <h2 id="climate-event-list-title" className="text-lg font-semibold">Eventos do município</h2>
      {loading ? <p role="status">Carregando eventos…</p> : events.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum evento climático cadastrado.</p> : events.map(item => <article key={item.id} className="glass-card space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{states[item.state]}</p><h3 className="mt-1 text-lg font-semibold">{item.name}</h3><p className="mt-1 text-sm text-muted-foreground">Previsto: {item.plannedStart} a {item.plannedEnd}{item.startedAt ? ` · Iniciado ${new Date(item.startedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}{item.endedAt ? ` · Encerrado ${new Date(item.endedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}` : ''}</p></div><span className="rounded-full border border-control-border px-3 py-1 text-xs">Versão {item.version}</span></div>
        {item.state !== 'ENCERRADO' && <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => { setEditing(editing === item.id ? null : item.id); setEditName(item.name); setEditStart(item.plannedStart); setEditEnd(item.plannedEnd); }} className="btn btn-secondary">Editar previsão</button>
          {item.state === 'PLANEJADO' && <button type="button" disabled={busy} onClick={() => void transition(item, 'start')} className="btn btn-primary">Iniciar evento</button>}
          {item.state === 'EM_ANDAMENTO' && <button type="button" disabled={busy} onClick={() => void transition(item, 'close')} className="btn btn-secondary">Encerrar evento</button>}
        </div>}
        {editing === item.id && <form onSubmit={event => void saveEdit(event, item)} className="grid gap-3 rounded border border-control-border p-4 sm:grid-cols-2" aria-label={`Editar ${item.name}`}>
          <label className="sm:col-span-2">Nome<input required maxLength={120} value={editName} onChange={event => setEditName(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
          <label>Início previsto<input required type="date" value={editStart} onChange={event => setEditStart(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
          <label>Fim previsto<input required type="date" min={editStart || undefined} value={editEnd} onChange={event => setEditEnd(event.target.value)} className="mt-1 block w-full rounded border border-control-border bg-background px-3 py-2" /></label>
          <div className="flex gap-2 sm:col-span-2"><button disabled={busy} className="btn btn-primary">Salvar</button><button type="button" onClick={() => setEditing(null)} className="btn btn-secondary">Cancelar edição</button></div>
        </form>}
        <div><h4 className="text-sm font-semibold">Ocorrências visíveis vinculadas</h4>{item.occurrences.length ? <ul className="mt-2 space-y-1">{item.occurrences.map(occurrence => <li key={occurrence.id}><Link className="text-sm text-primary underline-offset-2 hover:underline" href={`/painel/ocorrencias/${encodeURIComponent(occurrence.id)}`}>{occurrence.protocol} · {occurrence.status.replaceAll('_', ' ')}</Link></li>)}</ul> : <p className="mt-1 text-sm text-muted-foreground">Nenhuma ocorrência visível vinculada.</p>}</div>
      </article>)}
    </section>
  </main>;
}
