'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { AccessState, Role } from '../contracts';
import { ExpandableGroupPicker } from './ExpandableGroupPicker';

export type GroupRosterData = {
  groups: { id: string; name: string; isDefault: boolean }[];
  selectedGroupId: string | null;
  invalidGroup: boolean;
  actorId: string;
  users: { userId: string; name: string; phone: string | null; role: Role; state: AccessState; version: number; groupIds: string[] }[];
};

const roleLabels: Record<Role, string> = { CONSULTA: 'Consulta', VOLUNTARIO: 'Voluntário', OPERADOR: 'Operador', GESTOR: 'Gestor', ADMINISTRADOR: 'Administrador' };
const stateLabels: Record<AccessState, string> = { PENDENTE: 'Pendente', ATIVO: 'Ativo', SUSPENSO: 'Suspenso', DESATIVADO: 'Desativado' };

export function GroupRosterManager({ initialData }: { initialData: GroupRosterData }) {
  const [users, setUsers] = useState(initialData.users);
  const [newUserId, setNewUserId] = useState('');
  const [newPerson, setNewPerson] = useState({ name: '', phone: '', email: '', role: 'CONSULTA' as Role });
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [provisioningLink, setProvisioningLink] = useState('');
  const router = useRouter();
  const selected = initialData.groups.find((group) => group.id === initialData.selectedGroupId) ?? null;
  const members = useMemo(() => selected ? users.filter((user) => user.groupIds.includes(selected.id)) : [], [users, selected]);
  const available = useMemo(() => selected ? users.filter((user) => user.userId !== initialData.actorId && !user.groupIds.includes(selected.id)) : [], [users, selected, initialData.actorId]);

  async function saveUser(next: GroupRosterData['users'][number], successMessage: string) {
    setBusyId(next.userId); setError(''); setMessage('');
    try {
      const { userId, name, phone, role, state, groupIds } = next;
      const response = await fetch('/api/core/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_user', userId, name, phone, role, state, groupIds }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível salvar os dados da pessoa.');
      setUsers((current) => current.map((user) => user.userId === next.userId ? { ...next, version: user.version + 1 } : user));
      setMessage(successMessage);
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao salvar os dados da pessoa.'); }
    finally { setBusyId(''); }
  }

  function addSelectedUser() {
    if (!selected) return;
    const user = users.find((item) => item.userId === newUserId);
    if (!user) return;
    void saveUser({ ...user, groupIds: [...user.groupIds, selected.id] }, `${user.name} foi adicionado ao grupo ${selected.name}.`);
    setNewUserId('');
  }

  async function createGroupUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setBusyId('create-group-user'); setError(''); setMessage(''); setProvisioningLink('');
    try {
      const response = await fetch('/api/core/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_group_user', ...newPerson, groupId: selected.id }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message ?? 'Não foi possível criar a conta para este grupo.');
      if (typeof body.userId !== 'string' || typeof body.provisioningLink !== 'string') throw new Error('A conta foi criada, mas não foi possível carregar o link de acesso. Consulte os usuários cadastrados antes de tentar novamente.');
      const createdUser = { userId: body.userId, name: newPerson.name.trim(), phone: newPerson.phone.trim() || null, role: newPerson.role, state: 'PENDENTE' as AccessState, version: 1, groupIds: [selected.id] };
      setUsers((current) => current.some((user) => user.userId === createdUser.userId) ? current : [...current, createdUser]);
      setProvisioningLink(body.provisioningLink);
      setMessage(`Conta criada como Pendente e vinculada ao grupo ${selected.name}. Compartilhe o link de acesso de forma segura.`);
      setNewPerson({ name: '', phone: '', email: '', role: 'CONSULTA' });
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Falha ao criar a conta.'); }
    finally { setBusyId(''); }
  }

  if (!selected) return <p role="alert" className="rounded-xl border border-border p-4 text-sm text-muted-foreground">{initialData.invalidGroup ? 'O grupo solicitado não existe neste município.' : 'Nenhum grupo cadastrado neste município.'}</p>;

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-success/30 bg-success-soft p-3 text-sm text-success">{message}</p>}
    {initialData.groups.length > 1 && <form action="/painel/admin/grupos" method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
      <label htmlFor="groupId" className="min-w-56 flex-1 space-y-1 text-sm font-medium text-foreground"><span>Grupo</span><select id="groupId" name="groupId" defaultValue={selected.id} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground">{initialData.groups.map((group) => <option key={group.id} value={group.id}>{group.name}{group.isDefault ? ' · padrão' : ''}</option>)}</select></label>
      <button type="submit" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Consultar grupo</button>
    </form>}
    <section className="glass-card space-y-4 p-5 sm:p-6" aria-labelledby="selected-group-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="selected-group-title" className="text-lg font-semibold text-foreground">{selected.name}</h2><p className="text-sm text-muted-foreground">{members.length} {members.length === 1 ? 'pessoa vinculada' : 'pessoas vinculadas'}</p></div>
      <form className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface-subtle p-3" onSubmit={(event) => { event.preventDefault(); addSelectedUser(); }}>
        <label htmlFor="add-user-to-group" className="min-w-56 flex-1 space-y-1 text-sm font-medium text-foreground"><span>Adicionar pessoa existente</span><select id="add-user-to-group" required value={newUserId} onChange={(event) => setNewUserId(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground"><option value="">Selecione uma pessoa</option>{available.map((user) => <option key={user.userId} value={user.userId}>{user.name} · {stateLabels[user.state]}</option>)}</select></label>
        <button disabled={!newUserId || Boolean(busyId)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Adicionar ao grupo</button>
        {available.length === 0 && <p className="basis-full text-xs text-muted-foreground">Não há outras contas disponíveis para vincular. Você também pode criar uma conta já associada a este grupo abaixo.</p>}
      </form>
      <form aria-label={`Criar pessoa no grupo ${selected.name}`} onSubmit={(event) => void createGroupUser(event)} className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4"><h3 className="font-semibold text-foreground">Criar pessoa neste grupo</h3><p className="mt-1 text-xs text-muted-foreground">A conta começará como Pendente e será vinculada a {selected.name}. O e-mail é usado para o acesso; o sistema exibirá um link temporário após o cadastro.</p></div>
        <label className="space-y-1 text-sm text-foreground"><span>Nome *</span><input required maxLength={120} value={newPerson.name} onChange={(event) => setNewPerson((current) => ({ ...current, name: event.target.value }))} className="w-full rounded border border-control-border bg-background p-2" /></label>
        <label className="space-y-1 text-sm text-foreground"><span>Telefone</span><input type="tel" maxLength={40} value={newPerson.phone} onChange={(event) => setNewPerson((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded border border-control-border bg-background p-2" /></label>
        <label className="space-y-1 text-sm text-foreground"><span>E-mail *</span><input required type="email" maxLength={254} value={newPerson.email} onChange={(event) => setNewPerson((current) => ({ ...current, email: event.target.value }))} className="w-full rounded border border-control-border bg-background p-2" /></label>
        <label className="space-y-1 text-sm text-foreground"><span>Papel inicial *</span><select required value={newPerson.role} onChange={(event) => setNewPerson((current) => ({ ...current, role: event.target.value as Role }))} className="w-full rounded border border-control-border bg-background p-2">{Object.entries(roleLabels).filter(([value]) => value !== 'ADMINISTRADOR').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button disabled={Boolean(busyId)} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2 lg:col-span-4">{busyId === 'create-group-user' ? 'Criando conta…' : 'Criar conta neste grupo'}</button>
      </form>
      {provisioningLink && <section className="rounded-lg border border-warning/30 bg-warning-soft p-3" aria-labelledby="group-provisioning-link-title"><label id="group-provisioning-link-title" htmlFor="group-provisioning-link" className="text-sm font-semibold text-foreground">Link temporário para ativar a conta</label><input id="group-provisioning-link" readOnly value={provisioningLink} className="mt-2 w-full rounded border border-control-border bg-background p-2 text-xs text-foreground" /><p className="mt-1 text-xs text-muted-foreground">Copie e compartilhe este link com a pessoa. O sistema não envia e-mail.</p></section>}
      {members.length ? <ul className="divide-y divide-border" aria-label={`Pessoas do grupo ${selected.name}`}>
        {members.map((user) => <li key={user.userId} className="py-4 first:pt-0 last:pb-0"><GroupMemberEditor user={user} groups={initialData.groups} actorId={initialData.actorId} busy={busyId === user.userId || Boolean(busyId)} onSave={(next) => void saveUser(next, 'Dados e grupos da pessoa foram atualizados.')} onRemove={() => void saveUser({ ...user, groupIds: user.groupIds.filter((id) => id !== selected.id) }, `${user.name} foi removido do grupo ${selected.name}.`)} /></li>)}
      </ul> : <p className="rounded-lg bg-surface-subtle p-4 text-sm text-muted-foreground">Este grupo ainda não tem pessoas vinculadas.</p>}
    </section>
  </div>;
}

function GroupMemberEditor({ user, groups, actorId, busy, onSave, onRemove }: { user: GroupRosterData['users'][number]; groups: GroupRosterData['groups']; actorId: string; busy: boolean; onSave: (next: GroupRosterData['users'][number]) => void; onRemove: () => void }) {
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [role, setRole] = useState(user.role);
  const [state, setState] = useState(user.state);
  const [groupIds, setGroupIds] = useState(user.groupIds);
  const self = user.userId === actorId;
  return <article className="space-y-3">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold text-foreground">{user.name}</h3><p className="text-sm text-muted-foreground">{user.phone || 'Telefone não informado'} · {roleLabels[user.role]} · {stateLabels[user.state]}</p></div><div className="flex gap-2"><button type="button" disabled={self || busy} onClick={onRemove} className="rounded border border-danger/30 px-3 py-2 text-sm text-danger disabled:opacity-50">{self ? 'Sua conta protegida' : 'Remover do grupo'}</button><details className="relative"><summary className="cursor-pointer list-none rounded border border-control-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Editar dados</summary>
      <form className="absolute right-0 z-10 mt-2 grid w-[min(90vw,440px)] gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); onSave({ ...user, name, phone: phone || null, role, state, groupIds }); }}>
        <label className="space-y-1 text-sm text-foreground"><span>Nome</span><input disabled={self} required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded border border-control-border bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Telefone</span><input disabled={self} type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded border border-control-border bg-background p-2"/></label>
        <label className="space-y-1 text-sm text-foreground"><span>Papel</span><select disabled={self} value={role} onChange={(event) => setRole(event.target.value as Role)} className="w-full rounded border border-control-border bg-background p-2">{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="space-y-1 text-sm text-foreground"><span>Estado</span><select disabled={self} value={state} onChange={(event) => setState(event.target.value as AccessState)} className="w-full rounded border border-control-border bg-background p-2">{Object.entries(stateLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <div className="sm:col-span-2"><ExpandableGroupPicker groups={groups} selectedIds={groupIds} onChange={setGroupIds} label="Grupos autorizados" disabled={self} /></div>
        <button disabled={self || busy} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50 sm:col-span-2">Salvar dados e grupos</button>
      </form></details></div></div>
  </article>;
}
