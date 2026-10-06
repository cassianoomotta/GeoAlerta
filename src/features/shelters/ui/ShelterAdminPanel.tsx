'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdminShelter, ShelterStatus, ShelterType } from '../contracts';

type FormState = {
  name: string; type: ShelterType; address: string; lat: string; lng: string; mapUrl: string;
  capacity: string; occupied: string; phone: string; manager: string; status: ShelterStatus; isActive: boolean;
};
const blank: FormState = { name: '', type: 'humano', address: '', lat: '', lng: '', mapUrl: '', capacity: '0', occupied: '0', phone: '', manager: '', status: 'Aberto', isActive: true };
const field = 'w-full rounded-lg border border-control-border bg-surface px-3 py-2 text-sm text-foreground';
const label = 'space-y-1 text-sm text-foreground';
function numeric(value: string): number | null { return value.trim() ? Number(value) : null; }

function formFromShelter(shelter: AdminShelter): FormState {
  return { name: shelter.name, type: shelter.type, address: shelter.address ?? '', lat: shelter.lat === null ? '' : String(shelter.lat), lng: shelter.lng === null ? '' : String(shelter.lng), mapUrl: '', capacity: String(shelter.capacity), occupied: String(shelter.occupied), phone: shelter.phone ?? '', manager: shelter.manager ?? '', status: shelter.status, isActive: shelter.isActive };
}

type ShelterAdminPanelProps = { initialShelter?: AdminShelter; mode?: 'list' | 'create' };

export function ShelterAdminPanel({ initialShelter, mode = 'list' }: ShelterAdminPanelProps) {
  const view = initialShelter ? 'edit' : mode;
  const [shelters, setShelters] = useState<AdminShelter[]>([]);
  const [form, setForm] = useState(() => initialShelter ? formFromShelter(initialShelter) : blank);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(view === 'list');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function load() {
    const response = await fetch('/api/core/admin/shelters', { cache: 'no-store' });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar os abrigos.');
    setShelters(body.shelters as AdminShelter[]);
  }
  useEffect(() => {
    if (view !== 'list') return;
    let active = true;
    void fetch('/api/core/admin/shelters', { cache: 'no-store' }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível carregar os abrigos.');
      if (active) setShelters(body.shelters as AdminShelter[]);
    }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Falha ao carregar abrigos.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [view]);

  function reset() { setForm(blank); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const payload = { action: initialShelter ? 'update' : 'create', ...(initialShelter ? { id: initialShelter.id } : {}), ...form,
        lat: numeric(form.lat), lng: numeric(form.lng), capacity: Number(form.capacity), occupied: Number(form.occupied), phone: form.phone || null, manager: form.manager || null };
      const response = await fetch('/api/core/admin/shelters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível salvar o abrigo.');
      if (view !== 'list') {
        router.push('/painel/admin/shelters');
      } else {
        reset(); setMessage('Abrigo salvo e alteração registrada na auditoria.'); await load();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar.'); }
    finally { setBusy(false); }
  }
  async function remove(shelter: AdminShelter) {
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/core/admin/shelters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: shelter.id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível excluir. Se houver pessoas vinculadas, desative o abrigo.');
      setMessage('Abrigo excluído.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao excluir abrigo.'); }
    finally { setBusy(false); }
  }

  const isEditing = view === 'edit';
  const isFormPage = view !== 'list';

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6" aria-labelledby="shelters-title">
    <header><h1 id="shelters-title" className="text-2xl font-bold text-foreground">{isEditing ? `Editar abrigo: ${initialShelter?.name}` : view === 'create' ? 'Cadastrar abrigo' : 'Administrar abrigos'}</h1><p className="mt-1 text-sm text-muted-foreground">Cadastre endereço e coordenadas para orientar cidadãos. Apenas abrigos ativos com situação Aberto aparecem após o registro de qualquer ocorrência.</p><Link href={isFormPage ? '/painel/admin/shelters' : '/painel/admin'} className="mt-3 inline-flex text-sm text-primary underline">{isFormPage ? 'Cancelar e voltar à lista' : 'Voltar à administração'}</Link></header>
    {error && <p role="alert" className="rounded border border-danger/30 bg-danger-soft p-3 text-danger">{error}</p>}
    {message && <p role="status" className="rounded border border-success/30 bg-success-soft p-3 text-success">{message}</p>}
    {isFormPage && <section className="glass-card space-y-4 p-5" aria-labelledby="shelter-form-title">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="shelter-form-title" className="text-lg font-semibold text-foreground">{isEditing ? 'Editar abrigo' : 'Cadastrar abrigo'}</h2></div>
      <form className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => void save(event)}>
        <label className={label}><span>Nome do abrigo *</span><input required maxLength={160} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} className={field}/></label>
        <label className={label}><span>Tipo *</span><select required value={form.type} onChange={event => setForm(current => ({ ...current, type: event.target.value as ShelterType }))} className={field}><option value="humano">Pessoas</option><option value="pet">Animais</option><option value="misto">Pessoas e animais</option></select></label>
        <label className={`${label} sm:col-span-2 lg:col-span-1`}><span>Endereço *</span><input required maxLength={500} value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} placeholder="Rua, número, bairro, cidade" className={field}/></label>
        <label className={label}><span>Latitude</span><input type="number" step="any" min="-90" max="90" value={form.lat} onChange={event => setForm(current => ({ ...current, lat: event.target.value }))} className={field}/></label>
        <label className={label}><span>Longitude</span><input type="number" step="any" min="-180" max="180" value={form.lng} onChange={event => setForm(current => ({ ...current, lng: event.target.value }))} className={field}/></label>
        <label className={`${label} sm:col-span-2 lg:col-span-1`}><span>Link compartilhado do Google Maps ou Waze</span><input type="url" maxLength={2048} value={form.mapUrl} onChange={event => setForm(current => ({ ...current, mapUrl: event.target.value }))} placeholder="https://maps.google.com/... ou https://waze.com/ul?..." className={field}/><small className="text-muted-foreground">Preencha as coordenadas ou informe um link com localização reconhecível.</small></label>
        <label className={label}><span>Capacidade</span><input type="number" min="0" step="1" value={form.capacity} onChange={event => setForm(current => ({ ...current, capacity: event.target.value }))} className={field}/></label>
        <label className={label}><span>Pessoas acolhidas</span><input type="number" min="0" step="1" value={form.occupied} onChange={event => setForm(current => ({ ...current, occupied: event.target.value }))} className={field}/></label>
        <label className={label}><span>Contato</span><input type="tel" maxLength={40} value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} className={field}/></label>
        <label className={label}><span>Responsável</span><input maxLength={160} value={form.manager} onChange={event => setForm(current => ({ ...current, manager: event.target.value }))} className={field}/></label>
        <label className={label}><span>Situação</span><select value={form.status} onChange={event => setForm(current => ({ ...current, status: event.target.value as ShelterStatus }))} className={field}><option>Aberto</option><option>Lotado</option><option>Encerrado</option></select></label>
        <label className="inline-flex items-center gap-2 self-end pb-2 text-sm text-foreground"><input type="checkbox" checked={form.isActive} onChange={event => setForm(current => ({ ...current, isActive: event.target.checked }))}/>Ativo</label>
        <button disabled={busy} className="w-fit self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{busy ? 'Salvando…' : initialShelter ? 'Salvar alterações' : 'Cadastrar abrigo'}</button>
      </form>
    </section>}
    {view === 'list' && <>
      <Link href="/painel/admin/shelters/novo" className="inline-flex rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary">Cadastrar abrigo</Link>
      <section className="space-y-3" aria-labelledby="shelter-list-title"><h2 id="shelter-list-title" className="text-lg font-semibold text-foreground">Abrigos cadastrados</h2>
      {loading ? <p role="status" className="text-sm text-muted-foreground">Carregando abrigos…</p> : shelters.length ? shelters.map(shelter => <article key={shelter.id} className="glass-card flex flex-wrap items-start justify-between gap-3 p-4"><div><h3 className="font-semibold text-foreground">{shelter.name}</h3><p className="text-sm text-muted-foreground">{shelter.address || 'Endereço não cadastrado'} · {shelter.status} · {shelter.isActive ? 'Ativo' : 'Inativo'}</p><p className="text-xs text-muted-foreground">{shelter.lat ?? '—'}, {shelter.lng ?? '—'} · capacidade {shelter.capacity}, acolhidos {shelter.occupied}</p></div><div className="flex gap-2"><Link href={`/painel/admin/shelters/${shelter.id}/editar`} className="rounded border border-control-border px-3 py-2 text-sm text-foreground">Editar</Link><button disabled={busy} onClick={() => void remove(shelter)} className="rounded border border-danger/30 px-3 py-2 text-sm text-danger disabled:opacity-50">Excluir</button></div></article>) : <p className="rounded border border-border p-4 text-sm text-muted-foreground">Nenhum abrigo cadastrado.</p>}
      </section>
    </>}
  </main>;
}
