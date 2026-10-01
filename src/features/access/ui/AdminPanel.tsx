'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AccessState, Role } from '../contracts';

type Group = { id: string; name: string; isDefault: boolean };
type User = { userId: string; name: string; phone: string | null; role: Role; state: AccessState; groupIds: string[]; version: number };
type Payload = { users: User[]; groups: Group[]; actorId: string };
const roleLabels: Record<Role, string> = { CONSULTA: 'Consulta', OPERADOR: 'Operador', GESTOR: 'Gestor', ADMINISTRADOR: 'Administrador' };
const stateLabels: Record<AccessState, string> = { PENDENTE: 'Pendente', ATIVO: 'Ativo', SUSPENSO: 'Suspenso', DESATIVADO: 'Desativado' };

export function AdminPanel() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<Role>('CONSULTA');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [defaultGroup, setDefaultGroup] = useState(false);

  async function load() {
    const response = await fetch('/api/core/admin', { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message ?? 'Não foi possível carregar os acessos.');
    setData(result as Payload);
  }

  useEffect(() => {
    let mounted = true;
    void fetch('/api/core/admin', { cache: 'no-store' }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Não foi possível carregar os acessos.');
      if (mounted) setData(result as Payload);
    }).catch((cause: unknown) => {
      if (mounted) setError(cause instanceof Error ? cause.message : 'Falha ao carregar.');
    });
    return () => { mounted = false; };
  }, []);

  async function submit(action: string, values: Record<string, unknown>) {
    setBusy(true); setError(''); setMessage(''); setLink('');
    try {
      const response = await fetch('/api/core/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...values }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? 'Não foi possível salvar.');
      if (typeof result.provisioningLink === 'string') setLink(result.provisioningLink);
      setMessage(action === 'create_user' ? 'Conta criada como PENDENTE. Compartilhe o link de acesso de forma segura.' : 'Alterações salvas e auditadas.');
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Falha ao salvar.');
    } finally { setBusy(false); }
  }

  function toggleGroup(id: string, selected: boolean) {
    setGroupIds((current) => selected ? [...new Set([...current, id])] : current.filter((item) => item !== id));
  }

  if (!data && !error) return <main className="p-6 text-slate-300" role="status">Carregando acessos…</main>;
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6" aria-labelledby="admin-title">
    <header><h1 id="admin-title" className="text-2xl font-bold text-white">Administração de usuários e grupos</h1><p className="mt-1 text-sm text-slate-300">Gerencie papéis, escopos e estados de acesso. Cada mudança fica registrada em auditoria.</p></header>
    <Link href="/painel/admin/status" className="inline-flex rounded border border-blue-400/30 px-3 py-2 text-sm text-blue-100">Configurar rótulos e transições de status</Link>
    {error && <p role="alert" className="rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p>}
    {link && <section className="glass-card space-y-2 p-4"><label htmlFor="provision-link" className="text-sm font-semibold text-white">Link de acesso temporário</label><input id="provision-link" readOnly value={link} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-xs text-white"/><p className="text-xs text-amber-200">O link é exibido somente após salvar a conta PENDENTE. O sistema não envia e-mail.</p></section>}

    <section className="glass-card space-y-4 p-5" aria-labelledby="new-user-title">
      <h2 id="new-user-title" className="text-lg font-semibold text-white">Cadastrar usuário</h2>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void submit('create_user', { email, name, phone, role, groupIds }); }}>
        <label className="space-y-1 text-sm text-slate-200"><span>E-mail</span><input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded bg-slate-950 p-2"/></label>
        <label className="space-y-1 text-sm text-slate-200"><span>Nome</span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded bg-slate-950 p-2"/></label>
        <label className="space-y-1 text-sm text-slate-200"><span>Telefone</span><input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded bg-slate-950 p-2"/></label>
        <label className="space-y-1 text-sm text-slate-200"><span>Papel inicial</span><select value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded bg-slate-950 p-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <fieldset className="space-y-2 text-sm text-slate-200"><legend>Grupos autorizados</legend>{data?.groups.map((group) => <label key={group.id} className="mr-3 inline-flex items-center gap-2"><input type="checkbox" checked={groupIds.includes(group.id)} onChange={(event) => toggleGroup(group.id, event.target.checked)}/>{group.name}</label>)}</fieldset>
        <button disabled={busy} className="self-end rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Criar conta PENDENTE</button>
      </form>
    </section>

    <section className="glass-card space-y-4 p-5" aria-labelledby="groups-title">
      <h2 id="groups-title" className="text-lg font-semibold text-white">Grupos municipais</h2>
      <ul className="space-y-2">{data?.groups.map((group) => <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-slate-700 p-3 text-sm text-white"><span>{group.name}{group.isDefault ? ' · padrão' : ''}</span><button disabled={busy || group.isDefault} onClick={() => void submit('update_group', { id: group.id, name: group.name, isDefault: true })} className="rounded border border-slate-600 px-3 py-1 disabled:opacity-50">Definir como padrão</button></li>)}</ul>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void submit('create_group', { name: groupName, isDefault: defaultGroup }); setGroupName(''); setDefaultGroup(false); }}>
        <label className="space-y-1 text-sm text-slate-200"><span>Novo grupo</span><input required maxLength={100} value={groupName} onChange={(event) => setGroupName(event.target.value)} className="block rounded bg-slate-950 p-2"/></label>
        <label className="inline-flex items-center gap-2 pb-2 text-sm text-slate-200"><input type="checkbox" checked={defaultGroup} onChange={(event) => setDefaultGroup(event.target.checked)}/>Grupo padrão</label>
        <button disabled={busy} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Criar grupo</button>
      </form>
    </section>

    <section className="space-y-3" aria-labelledby="users-title"><h2 id="users-title" className="text-lg font-semibold text-white">Usuários cadastrados</h2>
      {data?.users.map((user) => <UserRow key={`${user.userId}:${user.version}:${user.role}:${user.state}:${user.groupIds.join(',')}`} user={user} groups={data.groups} isSelf={user.userId === data.actorId} busy={busy} onSave={(next) => void submit('update_user', next)}/>) }
    </section>
  </main>;
}

function UserRow({ user, groups, isSelf, busy, onSave }: { user: User; groups: Group[]; isSelf: boolean; busy: boolean; onSave: (update: { userId: string; role: Role; state: AccessState; groupIds: string[] }) => void }) {
  const [role, setRole] = useState(user.role);
  const [state, setState] = useState(user.state);
  const [groupIds, setGroupIds] = useState(user.groupIds);
  return <article className="glass-card space-y-3 p-4">
    <div><h3 className="font-semibold text-white">{user.name}</h3><p className="break-all text-xs text-slate-400">ID {user.userId} · versão {user.version}{isSelf ? ' · sua conta' : ''}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm text-slate-200"><span>Papel</span><select disabled={isSelf} value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded bg-slate-950 p-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-sm text-slate-200"><span>Estado</span><select disabled={isSelf} value={state} onChange={(event) => setState(event.target.value as AccessState)} className="w-full rounded bg-slate-950 p-2">{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="space-y-1 text-sm text-slate-200 lg:col-span-2"><legend>Grupos</legend>{groups.map((group) => <label key={group.id} className="mr-3 inline-flex items-center gap-2"><input disabled={isSelf} type="checkbox" checked={groupIds.includes(group.id)} onChange={(event) => setGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))}/>{group.name}</label>)}</fieldset>
    </div>
    <button disabled={isSelf || busy} onClick={() => onSave({ userId: user.userId, role, state, groupIds })} className="rounded border border-blue-400/40 px-3 py-2 text-sm text-blue-100 disabled:opacity-50">{isSelf ? 'Acesso próprio protegido' : 'Salvar alterações'}</button>
  </article>;
}
