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

  if (!data && !error) return <main className="p-6 text-muted-foreground" role="status">Carregando acessos…</main>;
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6" aria-labelledby="admin-title">
    <header><h1 id="admin-title" className="text-2xl font-bold text-foreground">Administração de usuários e grupos</h1><p className="mt-1 text-sm text-muted-foreground">Gerencie papéis, escopos e estados de acesso. Cada mudança fica registrada em auditoria.</p></header>
    <Link href="/painel/admin/status" className="inline-flex rounded border border-primary/30 px-3 py-2 text-sm text-primary">Configurar rótulos e transições de status</Link>
    <Link href="/painel/admin/risk-zones" className="ml-2 inline-flex rounded border border-warning/30 px-3 py-2 text-sm text-warning">Administrar zonas de risco</Link>
    <Link href="/painel/admin/shelters" className="ml-2 inline-flex rounded border border-success/30 px-3 py-2 text-sm text-success">Administrar abrigos</Link>
    <Link href="/painel/admin/auditoria" className="ml-2 inline-flex rounded border border-control-border px-3 py-2 text-sm text-foreground">Trilha de auditoria</Link>
    {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">{message}</p>}
    {link && <section className="glass-card space-y-2 p-4"><label htmlFor="provision-link" className="text-sm font-semibold text-foreground">Link de acesso temporário</label><input id="provision-link" readOnly value={link} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-xs text-foreground"/><p className="text-xs text-warning">O link é exibido somente após salvar a conta PENDENTE. O sistema não envia e-mail.</p></section>}

    <section className="glass-card space-y-4 p-5" aria-labelledby="new-user-title">
      <h2 id="new-user-title" className="text-lg font-semibold text-foreground">Cadastrar usuário</h2>
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); void submit('create_user', { email, name, phone, role, groupIds }); }}>
        <label className="space-y-1 text-sm text-foreground"><span>E-mail <span aria-hidden="true" className="text-danger">*</span></span><input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Nome <span aria-hidden="true" className="text-danger">*</span></span><input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Telefone</span><input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Papel inicial <span aria-hidden="true" className="text-danger">*</span></span><select required value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded bg-background p-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <fieldset className="space-y-2 text-sm text-foreground"><legend>Grupos autorizados</legend>{data?.groups.map((group) => <label key={group.id} className="mr-3 inline-flex items-center gap-2"><input type="checkbox" checked={groupIds.includes(group.id)} onChange={(event) => toggleGroup(group.id, event.target.checked)}/>{group.name}</label>)}</fieldset>
        <button disabled={busy} className="self-end rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Criar conta PENDENTE</button>
      </form>
    </section>

    <section className="glass-card space-y-4 p-5" aria-labelledby="groups-title">
      <h2 id="groups-title" className="text-lg font-semibold text-foreground">Grupos municipais</h2>
      <ul className="space-y-2">{data?.groups.map((group) => <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border p-3 text-sm text-foreground"><span>{group.name}{group.isDefault ? ' · padrão' : ''}</span><button disabled={busy || group.isDefault} onClick={() => void submit('update_group', { id: group.id, name: group.name, isDefault: true })} className="rounded border border-control-border px-3 py-1 disabled:opacity-50">Definir como padrão</button></li>)}</ul>
      <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); void submit('create_group', { name: groupName, isDefault: defaultGroup }); setGroupName(''); setDefaultGroup(false); }}>
        <label className="space-y-1 text-sm text-foreground"><span>Novo grupo <span aria-hidden="true" className="text-danger">*</span></span><input required maxLength={100} value={groupName} onChange={(event) => setGroupName(event.target.value)} className="block rounded bg-background p-2"/></label>
        <label className="inline-flex items-center gap-2 pb-2 text-sm text-foreground"><input type="checkbox" checked={defaultGroup} onChange={(event) => setDefaultGroup(event.target.checked)}/>Grupo padrão</label>
        <button disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Criar grupo</button>
      </form>
    </section>

    <section className="space-y-3" aria-labelledby="users-title"><h2 id="users-title" className="text-lg font-semibold text-foreground">Usuários cadastrados</h2>
      {data?.users.map((user) => <UserRow key={`${user.userId}:${user.version}:${user.role}:${user.state}:${user.groupIds.join(',')}`} user={user} groups={data.groups} isSelf={user.userId === data.actorId} busy={busy} onSave={(next) => void submit('update_user', next)}/>) }
    </section>
  </main>;
}

function UserRow({ user, groups, isSelf, busy, onSave }: { user: User; groups: Group[]; isSelf: boolean; busy: boolean; onSave: (update: { userId: string; role: Role; state: AccessState; groupIds: string[] }) => void }) {
  const [role, setRole] = useState(user.role);
  const [state, setState] = useState(user.state);
  const [groupIds, setGroupIds] = useState(user.groupIds);
  return <article className="glass-card space-y-3 p-4">
    <div><h3 className="font-semibold text-foreground">{user.name}</h3><p className="break-all text-xs text-muted-foreground">ID {user.userId} · versão {user.version}{isSelf ? ' · sua conta' : ''}</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="space-y-1 text-sm text-foreground"><span>Papel</span><select disabled={isSelf} value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded bg-background p-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="space-y-1 text-sm text-foreground"><span>Estado</span><select disabled={isSelf} value={state} onChange={(event) => setState(event.target.value as AccessState)} className="w-full rounded bg-background p-2">{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <fieldset className="space-y-1 text-sm text-foreground lg:col-span-2"><legend>Grupos</legend>{groups.map((group) => <label key={group.id} className="mr-3 inline-flex items-center gap-2"><input disabled={isSelf} type="checkbox" checked={groupIds.includes(group.id)} onChange={(event) => setGroupIds((current) => event.target.checked ? [...current, group.id] : current.filter((id) => id !== group.id))}/>{group.name}</label>)}</fieldset>
    </div>
    <button disabled={isSelf || busy} onClick={() => onSave({ userId: user.userId, role, state, groupIds })} className="rounded border border-primary/30 px-3 py-2 text-sm text-primary disabled:opacity-50">{isSelf ? 'Acesso próprio protegido' : 'Salvar alterações'}</button>
  </article>;
}
