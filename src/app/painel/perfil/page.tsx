'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ColumnPreferences } from '@/features/occurrences/ui/ColumnPreferences';
import type { Column, ListFilters } from '@/features/occurrences/list-input';

type Profile = {
  userId: string;
  name: string;
  phone: string | null;
  email: string;
  role: 'CONSULTA' | 'OPERADOR' | 'GESTOR' | 'ADMINISTRADOR';
  state: 'PENDENTE' | 'ATIVO' | 'SUSPENSO' | 'DESATIVADO';
  municipalityId: string;
  version: number;
  groups: { id: string; name: string }[];
  columns: Column[];
  availableColumns: Column[];
};

const roleLabels: Record<Profile['role'], string> = {
  CONSULTA: 'Consulta',
  OPERADOR: 'Operador',
  GESTOR: 'Gestor',
  ADMINISTRADOR: 'Administrador',
};
const stateLabels: Record<Profile['state'], string> = {
  PENDENTE: 'Pendente',
  ATIVO: 'Ativo',
  SUSPENSO: 'Suspenso',
  DESATIVADO: 'Desativado',
};
const profileFilters: ListFilters = {
  from: undefined, to: undefined, status: undefined, priority: undefined, type: undefined, groupId: undefined,
  page: 1, pageSize: 50, sort: 'createdAt', direction: 'desc',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/core/profile', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json() as Profile | { error?: { message?: string } };
        if (!response.ok) throw new Error('error' in body ? body.error?.message ?? 'Não foi possível carregar seu perfil.' : 'Não foi possível carregar seu perfil.');
        const current = body as Profile;
        setProfile(current);
        setName(current.name);
        setPhone(current.phone ?? '');
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Não foi possível carregar seu perfil.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/core/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) throw new Error(result.error?.message ?? 'Não foi possível salvar seu perfil.');
      setProfile((current) => current ? { ...current, name: name.trim(), phone: phone.trim() || null, version: current.version + 1 } : current);
      setMessage('Perfil atualizado.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível salvar seu perfil.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="mx-auto w-full max-w-3xl p-6 text-slate-300" role="status">Carregando perfil…</main>;
  if (!profile) return <main className="mx-auto w-full max-w-3xl p-6"><h1 className="text-2xl font-bold text-white">Meu perfil</h1><p role="alert" className="mt-4 text-red-200">{error || 'Não foi possível carregar seu perfil.'}</p></main>;

  return <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6" aria-labelledby="profile-title">
    <header>
      <h1 id="profile-title" className="text-2xl font-bold text-white">Meu perfil</h1>
      <p className="mt-1 text-sm text-slate-300">Consulte seu acesso atual e atualize seus próprios dados.</p>
    </header>

    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}

    <section className="glass-card space-y-5 p-5" aria-labelledby="profile-access-title">
      <h2 id="profile-access-title" className="text-lg font-semibold text-white">Identificação e acesso</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-slate-400">E-mail institucional</dt><dd className="mt-1 text-sm text-white">{profile.email}</dd></div>
        <div><dt className="text-xs text-slate-400">Papel</dt><dd className="mt-1 text-sm text-white">{roleLabels[profile.role]}</dd></div>
        <div><dt className="text-xs text-slate-400">Estado de acesso</dt><dd className="mt-1 text-sm text-white">{stateLabels[profile.state]}</dd></div>
        <div><dt className="text-xs text-slate-400">Município</dt><dd className="mt-1 text-sm text-white">{profile.municipalityId}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-slate-400">Grupos autorizados</dt><dd className="mt-1 text-sm text-white">{profile.groups.length ? profile.groups.map((group) => group.name).join(', ') : 'Nenhum grupo atribuído'}</dd></div>
      </dl>
    </section>

    <section className="glass-card space-y-5 p-5" aria-labelledby="profile-edit-title">
      <h2 id="profile-edit-title" className="text-lg font-semibold text-white">Meus dados</h2>
      <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-200">
          <span>Nome <span aria-hidden="true" className="text-red-400">*</span></span>
          <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Telefone</span>
          <input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={saving} className="w-fit rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar dados'}</button>
      </form>
    </section>

    <section className="glass-card space-y-3 p-5" aria-labelledby="profile-preferences-title">
      <h2 id="profile-preferences-title" className="text-lg font-semibold text-white">Preferências de lista</h2>
      <ColumnPreferences columns={profile.columns} available={profile.availableColumns} filters={profileFilters} returnTo="/painel/perfil" />
    </section>
  </main>;
}
