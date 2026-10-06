'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { ZoneGeometry } from '../domain/risk-zones';
import type { ZoneSnapshot } from './RiskZoneHistoryMap';

const RiskZoneHistoryMap = dynamic(() => import('./RiskZoneHistoryMap'), { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-slate-800" aria-label="Carregando mapa histórico" /> });

type Zone = { zoneId: string; version: number; name: string; type: 'INUNDACAO' | 'RISCO'; active: boolean; validFrom: string | null; validTo: string | null; geometry: ZoneGeometry };
type ZoneType = Zone['type'];
const blank = { name: '', type: 'INUNDACAO' as ZoneType, active: false, validFrom: '', validTo: '', geometryText: '', reason: '', replacesZoneId: '', duplicateOverrideReason: '' };

export function RiskZonePanel() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Zone | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [historyAt, setHistoryAt] = useState('');
  const [historyCompareAt, setHistoryCompareAt] = useState('');
  const [historySnapshots, setHistorySnapshots] = useState<ZoneSnapshot[] | null>(null);
  const [historyError, setHistoryError] = useState('');
  const [historyBusy, setHistoryBusy] = useState(false);

  async function load() {
    const response = await fetch('/api/core/admin/risk-zones', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar as zonas.');
    setZones(body.zones as Zone[]);
  }

  useEffect(() => {
    let mounted = true;
    void fetch('/api/core/admin/risk-zones', { cache: 'no-store' }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar as zonas.');
      if (mounted) setZones(body.zones as Zone[]);
    }).catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : 'Falha ao carregar zonas.'); });
    return () => { mounted = false; };
  }, []);

  function startEdit(zone: Zone) {
    setEditing(zone);
    setForm({ ...blank, name: zone.name, type: zone.type, active: zone.active, validFrom: toLocalInput(zone.validFrom), validTo: toLocalInput(zone.validTo), geometryText: JSON.stringify(zone.geometry, null, 2) });
    setError(''); setMessage('');
  }

  function startCreate() { setEditing(null); setForm(blank); setError(''); setMessage(''); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      let geometry: unknown;
      try { geometry = JSON.parse(form.geometryText); } catch { throw new Error('A geometria deve ser um GeoJSON válido.'); }
      const payload = {
        name: form.name, type: form.type, active: form.active,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validTo: form.validTo ? new Date(form.validTo).toISOString() : null,
        geometry,
        reason: form.reason,
        ...(form.replacesZoneId.trim() ? { replacesZoneId: form.replacesZoneId.trim() } : {}),
        ...(form.duplicateOverrideReason.trim() ? { duplicateOverrideReason: form.duplicateOverrideReason.trim() } : {}),
        ...(editing ? { zoneId: editing.zoneId, expectedVersion: editing.version } : {}),
      };
      const response = await fetch('/api/core/admin/risk-zones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: editing ? 'update' : 'create', ...payload }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível salvar a zona.');
      startCreate();
      setMessage(`Versão ${body.version} salva e auditada. As próximas ocorrências usarão a versão atual vigente.`);
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar a zona.'); }
    finally { setBusy(false); }
  }

  async function compareHistory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setHistoryBusy(true); setHistoryError('');
    try {
      const at = new Date(historyAt).toISOString();
      const compareAt = new Date(historyCompareAt).toISOString();
      const query = new URLSearchParams({ at, compareAt });
      const response = await fetch(`/api/core/admin/risk-zones?${query.toString()}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível consultar o histórico.');
      setHistorySnapshots(body.snapshots as ZoneSnapshot[]);
    } catch (cause) { setHistoryError(cause instanceof Error ? cause.message : 'Falha ao consultar o histórico.'); }
    finally { setHistoryBusy(false); }
  }

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6" aria-labelledby="zones-title">
    <header><h1 id="zones-title" className="text-2xl font-bold text-foreground">Administrar zonas de risco</h1><p className="mt-1 text-sm text-muted-foreground">Cada alteração cria uma versão nova. Classificações já registradas continuam vinculadas às versões originais.</p><Link href="/painel/admin" className="mt-3 inline-flex text-sm text-primary underline">Voltar à administração</Link></header>
    {error && <p role="alert" className="rounded border border-danger/30 bg-danger-soft p-3 text-danger">{error}</p>}
    {message && <p role="status" className="rounded border border-success/30 bg-success-soft p-3 text-success">{message}</p>}
    <section className="glass-card space-y-4 p-5" aria-labelledby="zone-form-title">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="zone-form-title" className="text-lg font-semibold text-foreground">{editing ? `Nova versão de ${editing.name} · atual ${editing.version}` : 'Cadastrar zona'}</h2>{editing && <button type="button" onClick={startCreate} className="rounded border border-control-border px-3 py-2 text-sm text-foreground">Cancelar edição</button>}</div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void save(event)}>
        <label className="space-y-1 text-sm text-foreground"><span>Nome <span aria-hidden="true" className="text-danger">*</span></span><input required maxLength={120} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="w-full rounded bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Tipo <span aria-hidden="true" className="text-danger">*</span></span><select required value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as ZoneType }))} className="w-full rounded bg-background p-2"><option value="INUNDACAO">Inundação</option><option value="RISCO">Risco</option></select></label>
        <label className="space-y-1 text-sm text-foreground"><span>Vigência inicial</span><input type="datetime-local" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} className="w-full rounded bg-background p-2"/><small className="block text-muted-foreground">Vazio significa sem início definido.</small></label>
        <label className="space-y-1 text-sm text-foreground"><span>Vigência final</span><input type="datetime-local" value={form.validTo} onChange={(event) => setForm((current) => ({ ...current, validTo: event.target.value }))} className="w-full rounded bg-background p-2"/><small className="block text-muted-foreground">Vazio significa sem encerramento definido.</small></label>
        <label className="inline-flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}/>Ativa</label>
        <label className="space-y-1 text-sm text-foreground sm:col-span-2"><span>Geometria GeoJSON (Polygon ou MultiPolygon, coordenadas longitude/latitude) <span aria-hidden="true" className="text-danger">*</span></span><textarea required rows={10} value={form.geometryText} onChange={(event) => setForm((current) => ({ ...current, geometryText: event.target.value }))} className="w-full rounded bg-background p-3 font-mono text-xs" placeholder={'Cole o objeto Geometry GeoJSON da zona'} /></label>
        <p className="text-xs text-muted-foreground sm:col-span-2">A geometria precisa ser fechada, válida e usar coordenadas WGS84. A classificação considera a versão atual ativa e vigente e inclui pontos na borda.</p>
        <button disabled={busy} className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Salvando…' : editing ? 'Salvar nova versão' : 'Cadastrar zona'}</button>
      </form>
    </section>
    <section className="space-y-3" aria-labelledby="zones-list-title"><div className="flex items-center justify-between"><h2 id="zones-list-title" className="text-lg font-semibold text-foreground">Zonas e versões atuais</h2><button onClick={startCreate} className="rounded border border-primary/30 px-3 py-2 text-sm text-primary">Nova zona</button></div>
      {zones.length ? zones.map((zone) => <article key={zone.zoneId} className="glass-card flex flex-wrap items-start justify-between gap-3 p-4"><div><h3 className="font-semibold text-foreground">{zone.name}</h3><p className="text-sm text-muted-foreground">{zone.type === 'INUNDACAO' ? 'Inundação' : 'Risco'} · versão {zone.version} · {zone.active ? 'ativa' : 'inativa'}</p><p className="text-xs text-muted-foreground">Vigência: {formatDate(zone.validFrom)} a {formatDate(zone.validTo)}</p></div><button onClick={() => startEdit(zone)} className="rounded border border-control-border px-3 py-2 text-sm text-foreground">Criar próxima versão</button></article>) : <p className="rounded border border-border p-4 text-sm text-muted-foreground">Nenhuma zona registrada.</p>}
    </section>
    <section className="glass-card space-y-4 p-5" aria-labelledby="zone-history-title">
      <div><h2 id="zone-history-title" className="text-lg font-semibold text-foreground">Comparar zonas por vigência</h2><p className="mt-1 text-sm text-muted-foreground">Consulte as versões efetivas em duas datas. A comparação é somente leitura e não altera classificações de ocorrências.</p></div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => void compareHistory(event)}>
        <label className="space-y-1 text-sm text-foreground"><span>Data base <span aria-hidden="true" className="text-danger">*</span></span><input aria-label="Data base" required type="datetime-local" value={historyAt} onChange={(event) => setHistoryAt(event.target.value)} className="w-full rounded border border-control-border bg-background p-2" /></label>
        <label className="space-y-1 text-sm text-foreground"><span>Data comparada <span aria-hidden="true" className="text-danger">*</span></span><input aria-label="Data comparada" required type="datetime-local" value={historyCompareAt} onChange={(event) => setHistoryCompareAt(event.target.value)} className="w-full rounded border border-control-border bg-background p-2" /></label>
        <button disabled={historyBusy} className="w-fit rounded bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{historyBusy ? 'Consultando…' : 'Comparar datas'}</button>
      </form>
      {historyError && <p role="alert" className="rounded border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{historyError}</p>}
      {historySnapshots && <RiskZoneHistoryMap snapshots={historySnapshots} />}
    </section>
  </main>;
}

function toLocalInput(value: string | null) { const date = value ? new Date(value) : null; return date ? new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''; }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : 'sem limite'; }
