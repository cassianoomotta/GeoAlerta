'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ColumnPreferences } from '@/features/occurrences/ui/ColumnPreferences';
import type { Column, ListFilters } from '@/features/occurrences/list-input';
import { ThemeSelect } from '@/components/theme/theme-select';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Profile = {
  userId: string;
  name: string;
  phone: string | null;
  email: string;
  role: 'CONSULTA' | 'VOLUNTARIO' | 'OPERADOR' | 'GESTOR' | 'ADMINISTRADOR';
  state: 'PENDENTE' | 'ATIVO' | 'SUSPENSO' | 'DESATIVADO';
  municipalityId: string;
  version: number;
  groups: { id: string; name: string }[];
  columns: Column[];
  availableColumns: Column[];
};

const roleLabels: Record<Profile['role'], string> = {
  CONSULTA: 'Consulta',
  VOLUNTARIO: 'Voluntário',
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
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
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

  async function signOut() {
    setSigningOut(true);
    setError('');
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError('Não foi possível encerrar a sessão. Tente novamente.');
      setSigningOut(false);
      return;
    }
    router.replace('/login');
    router.refresh();
  }

  if (loading) return <main className="mx-auto w-full max-w-3xl p-6 text-muted-foreground" role="status">Carregando perfil…</main>;
  if (!profile) return <main className="mx-auto w-full max-w-3xl p-6"><h1 className="text-2xl font-bold text-foreground">Meu perfil</h1><p role="alert" className="mt-4 text-danger">{error || 'Não foi possível carregar seu perfil.'}</p></main>;

  return <main className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6" aria-labelledby="profile-title">
    <header>
      <h1 id="profile-title" className="text-2xl font-bold text-foreground">Meu perfil</h1>
      <p className="mt-1 text-sm text-muted-foreground">Consulte seu acesso atual e atualize seus próprios dados.</p>
    </header>

    {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">{message}</p>}

    <section className="glass-card space-y-5 p-5" aria-labelledby="profile-access-title">
      <h2 id="profile-access-title" className="text-lg font-semibold text-foreground">Identificação e acesso</h2>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-xs text-muted-foreground">E-mail institucional</dt><dd className="mt-1 text-sm text-foreground">{profile.email}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Papel</dt><dd className="mt-1 text-sm text-foreground">{roleLabels[profile.role]}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Estado de acesso</dt><dd className="mt-1 text-sm text-foreground">{stateLabels[profile.state]}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Município</dt><dd className="mt-1 text-sm text-foreground">{profile.municipalityId}</dd></div>
        <div className="sm:col-span-2"><dt className="text-xs text-muted-foreground">Grupos autorizados</dt><dd className="mt-1 text-sm text-foreground">{profile.groups.length ? profile.groups.map((group) => group.name).join(', ') : 'Nenhum grupo atribuído'}</dd></div>
      </dl>
    </section>

    <section className="glass-card space-y-5 p-5" aria-labelledby="profile-edit-title">
      <h2 id="profile-edit-title" className="text-lg font-semibold text-foreground">Meus dados</h2>
      <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-foreground">
          <span>Nome <span aria-hidden="true" className="text-danger">*</span></span>
          <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground" />
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span>Telefone</span>
          <input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground" />
        </label>
        <Button type="submit" loading={saving} className="w-fit">Salvar dados</Button>
      </form>
    </section>

    <section className="surface-panel space-y-4 p-5" aria-labelledby="profile-appearance-title">
      <h2 id="profile-appearance-title" className="text-lg font-semibold">Aparência</h2>
      <ThemeSelect />
      <p className="text-sm text-muted-foreground">A escolha é aplicada imediatamente e salva neste navegador. Sistema acompanha a aparência do dispositivo.</p>
    </section>

    <section className="glass-card space-y-3 p-5" aria-labelledby="profile-preferences-title">
      <h2 id="profile-preferences-title" className="text-lg font-semibold text-foreground">Preferências de lista</h2>
      <ColumnPreferences columns={profile.columns} available={profile.availableColumns} filters={profileFilters} returnTo="/painel/perfil" />
    </section>

    <section className="glass-card space-y-3 p-5" aria-labelledby="profile-session-title">
      <h2 id="profile-session-title" className="text-lg font-semibold text-foreground">Sessão</h2>
      <p className="text-sm text-muted-foreground">Encerre seu acesso ao painel neste dispositivo.</p>
      <button type="button" onClick={signOut} disabled={signingOut} className="inline-flex items-center gap-2 rounded-lg border border-danger/30 bg-danger-soft px-4 py-2 text-sm font-semibold text-danger hover:bg-danger-soft disabled:opacity-50">
        <LogOut size={16} /> {signingOut ? 'Encerrando sessão…' : 'Encerrar Sessão'}
      </button>
    </section>
  </main>;
}
