'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEffect, useState } from 'react';
import {OccurrencePhoto} from '@/features/occurrences/ui/OccurrencePhoto';
import type { Priority, Status } from '@/features/occurrences/contracts';

interface OccurrenceDetail {
  id: string;
  protocol: string;
  type: string;
  description: string | null;
  address: string | null;
  status: { code: Status; label: string };
  priority: Priority;
  group: { id: string; name: string };
  position: { latitude: number; longitude: number; accuracy: number | null } | null;
  openedAt: string;
  updatedAt: string;
  version: number;
  classification: { zones: { id: string; name: string; version: number }[] } | null;
  events: { id: string; kind: string; actorId: string | null; at: string }[];
  occurrenceContext: {
    registeringInstitution: { code: string; label: string } | null;
    neighborhood: { code: string; label: string } | null;
    locality: { code: string; label: string } | null;
  };
  triage: {
    situation: string | null;
    damageLocation: { code: string; label: string; detail: string | null } | null;
    hasVictims: boolean | null;
    hasDisplaced: boolean | null;
  };
  privateData?: { reporterName: string | null; reporterContact: string | null; hasPhoto: boolean };
  serviceRecords: {
    id: string;
    agency: { code: string; label: string };
    attendingPerson: string;
    attendedAt: string;
    action: string;
    outcome: string | null;
    reinforcementRequested: boolean;
    actorId: string;
    createdAt: string;
    correctionOfId: string | null;
    correctionReason: string | null;
  }[];
  actions: { canOperate: boolean; canReclassify: boolean; canAdminister: boolean; availableTransitions: {target: Status; reasonRequired: boolean}[] };
  availableGroups: { id: string; name: string }[];
  serviceAgencyOptions: { code: string; label: string }[];
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

function displayBoolean(value: boolean | null) {
  return value === null ? 'Não informado' : value ? 'Sim' : 'Não';
}

function displayValue(value: string | null | undefined) {
  return value?.trim() ? value : 'Não informado';
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

  async function reloadDetail() {
    const response = await fetch(`/api/core/occurrences/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) return false;
    setDetail(await response.json() as OccurrenceDetail);
    return true;
  }

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

      {detail.actions.canOperate && <OccurrenceMutationControls key={`${detail.id}:${detail.version}`} detail={detail} onReload={reloadDetail} />}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-citizen-title">
        <h2 id="occurrence-citizen-title" className="text-lg font-semibold text-white">Informações do cidadão</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {detail.privateData ? <>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nome</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.privateData.reporterName)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contato</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.privateData.reporterContact)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Foto</dt><dd className="mt-1 text-sm text-slate-100">{detail.privateData.hasPhoto ? 'Anexada' : 'Não informada'}</dd></div>
          </> : <div className="sm:col-span-2"><p className="text-sm text-slate-300">Dados pessoais disponíveis somente para perfis autorizados.</p></div>}
        </dl>
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-information-title">
        <h2 id="occurrence-information-title" className="text-lg font-semibold text-white">Informações da ocorrência</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Tipo</dt><dd className="mt-1 text-sm text-slate-100">{detail.type}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Protocolo</dt><dd className="mt-1 text-sm text-slate-100">{detail.protocol}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</dt><dd className="mt-1 text-sm text-slate-100">{detail.status.label}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Prioridade</dt><dd className="mt-1 text-sm text-slate-100">{detail.priority}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grupo responsável</dt><dd className="mt-1 text-sm text-slate-100">{detail.group.name}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Abertura</dt><dd className="mt-1 text-sm text-slate-100">{formatDate(detail.openedAt)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Última atualização</dt><dd className="mt-1 text-sm text-slate-100">{formatDate(detail.updatedAt)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Descrição do cidadão</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-slate-100">{detail.description || 'Sem descrição informada.'}</dd></div>
        </dl>
        <h3 className="mt-6 text-sm font-semibold text-white">Localização informada</h3>
        {detail.address && <p className="mt-3 text-sm text-slate-100"><strong>Endereço:</strong> {detail.address}</p>}
        {detail.position ? (
          <div className="mt-4 grid gap-3 text-sm text-slate-100 sm:grid-cols-3">
            <p>Latitude: {formatCoordinate(detail.position.latitude)}</p>
            <p>Longitude: {formatCoordinate(detail.position.longitude)}</p>
            <p>Precisão: {detail.position.accuracy === null ? 'Indisponível' : `${formatCoordinate(detail.position.accuracy)} m`}</p>
          </div>
        ) : <p className="mt-3 text-sm text-slate-300">Localização indisponível</p>}
        <h3 className="mt-6 text-sm font-semibold text-white">Classificação na abertura</h3>
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

      {detail.privateData?.hasPhoto && <section className="glass-card p-5 sm:p-7" aria-label="Foto anexada">
        <OccurrencePhoto occurrenceId={detail.id} />
      </section>}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-triage-title">
        <h2 id="occurrence-triage-title" className="text-lg font-semibold text-white">Impactos e triagem</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instituição que registrou</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.occurrenceContext.registeringInstitution?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Bairro</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.occurrenceContext.neighborhood?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Localidade</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.occurrenceContext.locality?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Situação</dt><dd className="mt-1 text-sm text-slate-100">{detail.triage.situation === 'EM_RISCO' ? 'Em risco de ocorrer' : detail.triage.situation === 'JA_OCORREU' ? 'Já ocorreu' : 'Não informado'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Local/estrutura atingida</dt><dd className="mt-1 text-sm text-slate-100">{displayValue(detail.triage.damageLocation?.label)}{detail.triage.damageLocation?.detail ? ` — ${detail.triage.damageLocation.detail}` : ''}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Vítimas</dt><dd className="mt-1 text-sm text-slate-100">{displayBoolean(detail.triage.hasVictims)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Desabrigados/desalojados</dt><dd className="mt-1 text-sm text-slate-100">{displayBoolean(detail.triage.hasDisplaced)}</dd></div>
        </dl>
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-attendance-title">
        <h2 id="occurrence-attendance-title" className="text-lg font-semibold text-white">Atendimento e ações</h2>
        {detail.serviceRecords.length ? (
          <ol aria-label="Registros de atendimento" className="mt-4 space-y-0 border-l border-white/10 pl-5">
            {detail.serviceRecords.map((record) => (
              <li key={record.id} className="relative border-b border-white/5 py-4 last:border-b-0">
                <span aria-hidden="true" className="absolute -left-[1.58rem] top-5 h-2 w-2 rounded-full bg-emerald-400" />
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-slate-100">{record.agency.label}</h3><time className="text-xs text-slate-400" dateTime={record.attendedAt}>{formatDate(record.attendedAt)}</time></div>
                <p className="mt-1 text-xs text-slate-300">Responsável: {record.attendingPerson}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-100">{record.action}</p>
                {record.outcome && <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300"><strong>Resultado:</strong> {record.outcome}</p>}
                <p className="mt-2 text-xs text-slate-300">Reforço solicitado: {record.reinforcementRequested ? 'Sim' : 'Não'}</p>
                {record.correctionReason && <p className="mt-2 text-xs text-amber-200">Correção deste registro: {record.correctionReason}</p>}
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-slate-300">Nenhuma ação de atendimento registrada.</p>}
        {detail.actions.canOperate && <ServiceRecordForm key={detail.id} detail={detail} onReload={reloadDetail} />}
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-history-title">
        <h2 id="occurrence-history-title" className="text-lg font-semibold text-white">Histórico técnico</h2>
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

const statusLabels: Record<Status, string> = {
  NOVA: 'Nova',
  EM_TRIAGEM: 'Em triagem',
  EM_ATENDIMENTO: 'Em atendimento',
  RESOLVIDA: 'Resolvida',
  CANCELADA: 'Cancelada',
};

function ServiceRecordForm({ detail, onReload }: { detail: OccurrenceDetail; onReload: () => Promise<boolean> }) {
  const [agencyCode, setAgencyCode] = useState(detail.serviceAgencyOptions[0]?.code ?? '');
  const [attendingPerson, setAttendingPerson] = useState('');
  const [attendedAt, setAttendedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [reinforcementRequested, setReinforcementRequested] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(detail.id)}/service-records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agencyCode,
          attendingPerson,
          attendedAt: new Date(attendedAt).toISOString(),
          action,
          outcome: outcome.trim() || null,
          reinforcementRequested,
        }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Não foi possível salvar o atendimento. Os dados preenchidos foram mantidos.');
        return;
      }
      if (!await onReload()) {
        setMessage('Atendimento salvo. Atualize a página para consultar o novo registro.');
        return;
      }
      setAttendingPerson('');
      setAction('');
      setOutcome('');
      setReinforcementRequested(false);
      setMessage('Registro de atendimento salvo.');
    } catch {
      setMessage('Falha de comunicação. Confira o registro antes de tentar novamente; os dados preenchidos foram mantidos.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="mt-6 space-y-4 border-t border-white/10 pt-5" onSubmit={submit} aria-labelledby="service-record-form-title">
      <div>
        <h3 id="service-record-form-title" className="text-base font-semibold text-white">Registrar ação de atendimento</h3>
        <p className="mt-1 text-xs text-slate-400">Cada envio acrescenta um registro ao histórico; registros anteriores são preservados.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-200">
          <span>Órgão responsável <span aria-hidden="true" className="text-red-400">*</span></span>
          <select required value={agencyCode} onChange={(event) => setAgencyCode(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            {detail.serviceAgencyOptions.map((agency) => <option key={agency.code} value={agency.code}>{agency.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Agente ou responsável <span aria-hidden="true" className="text-red-400">*</span></span>
          <input required maxLength={160} value={attendingPerson} onChange={(event) => setAttendingPerson(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Data e hora do atendimento <span aria-hidden="true" className="text-red-400">*</span></span>
          <input required type="datetime-local" value={attendedAt} onChange={(event) => setAttendedAt(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200 sm:col-span-2">
          <span>Ação realizada <span aria-hidden="true" className="text-red-400">*</span></span>
          <textarea required minLength={1} maxLength={4000} rows={4} value={action} onChange={(event) => setAction(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200 sm:col-span-2">
          <span>Resultado ou observações</span>
          <textarea maxLength={4000} rows={3} value={outcome} onChange={(event) => setOutcome(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-200 sm:col-span-2">
          <input type="checkbox" checked={reinforcementRequested} onChange={(event) => setReinforcementRequested(event.target.checked)} className="h-4 w-4 rounded border-slate-500 bg-slate-950 text-blue-500" />
          Foi solicitado reforço
        </label>
      </div>
      <button type="submit" disabled={saving || !detail.serviceAgencyOptions.length} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar atendimento'}</button>
      {message && <p role="status" className="text-sm text-slate-200">{message}</p>}
    </form>
  );
}

function OccurrenceMutationControls({
  detail,
  onReload,
}: {
  detail: OccurrenceDetail;
  onReload: () => Promise<boolean>;
}) {
  const router = useRouter();
  const [type, setType] = useState(detail.type);
  const [description, setDescription] = useState(detail.description ?? '');
  const [groupId, setGroupId] = useState(detail.group.id);
  const [reason, setReason] = useState('');
  const [deletionReason, setDeletionReason] = useState('');
  const [priority, setPriority] = useState<Priority>(detail.priority);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);

  async function submit(command: Record<string, unknown>) {
    setSaving(true);
    setMessage('');
    setConflict(false);
    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: detail.version, command }),
      });
      const result = await response.json() as { error?: { code?: string; message?: string } };
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Não foi possível salvar a alteração.');
        setConflict(response.status === 409);
        return;
      }
      if (command.kind === 'delete') {
        router.push('/painel/ocorrencias/excluidas');
        return;
      }
      const refreshed = await onReload();
      setMessage(refreshed ? 'Alteração salva.' : 'Alteração salva. Atualize o detalhe para ver o estado atual.');
    } catch {
      setMessage('Falha de comunicação. Verifique o estado atual antes de tentar novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = {
      kind: 'edit',
      ...(type.trim() !== detail.type ? { type: type.trim() } : {}),
      ...(description.trim() !== (detail.description ?? '') ? { description: description.trim() } : {}),
      ...(groupId !== detail.group.id ? { groupId } : {}),
    };
    if (Object.keys(command).length === 1) {
      setMessage('Faça ao menos uma alteração antes de salvar.');
      return;
    }
    await submit(command);
  }

  async function reloadAfterConflict() {
    setSaving(true);
    try {
      const refreshed = await onReload();
      setConflict(false);
      setMessage(refreshed ? 'Estado atual carregado. Confira os valores antes de salvar novamente.' : 'Não foi possível atualizar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="glass-card space-y-5 p-5 sm:p-7" aria-labelledby="occurrence-mutation-title">
      <div>
        <h2 id="occurrence-mutation-title" className="text-lg font-semibold text-white">Editar e atualizar ocorrência</h2>
        <p className="mt-1 text-xs text-slate-400">Versão {detail.version}. Alterações concorrentes exigem atualização antes de salvar novamente.</p>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={submitEdit}>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Tipo <span aria-hidden="true" className="text-red-400">*</span></span>
          <input required maxLength={80} value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <label className="space-y-1 text-sm text-slate-200">
          <span>Grupo responsável <span aria-hidden="true" className="text-red-400">*</span></span>
          <select required value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            {detail.availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-200 sm:col-span-2">
          <span>Descrição</span>
          <textarea maxLength={2000} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Salvar edição</button>
      </form>

      {detail.actions.availableTransitions.length > 0 && <div className="space-y-3 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Transições disponíveis</h3>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Justificativa (quando exigida pela regra){detail.actions.availableTransitions.some((transition) => transition.reasonRequired) && <span aria-hidden="true" className="ml-1 text-red-400">*</span>}</span>
          <textarea maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <div className="flex flex-wrap gap-2">
          {detail.actions.availableTransitions.map((transition) => (
            <button key={transition.target} type="button" disabled={saving} onClick={() => void submit({ kind: 'transition', target: transition.target, ...(reason.trim() ? { reason: reason.trim() } : {}) })} className="rounded-lg border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-sm text-blue-100 disabled:opacity-50">
              {statusLabels[transition.target]}{transition.reasonRequired ? ' · justificativa obrigatória' : ''}
            </button>
          ))}
        </div>
      </div>}

      {detail.actions.canReclassify && <div className="space-y-3 border-t border-white/10 pt-4">
        <h3 className="text-sm font-semibold text-white">Reclassificar prioridade</h3>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Nova prioridade <span aria-hidden="true" className="text-red-400">*</span></span>
          <select required value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white">
            <option value="NORMAL">Normal</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Justificativa obrigatória <span aria-hidden="true" className="text-red-400">*</span></span>
          <textarea required minLength={10} maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="button" disabled={saving} onClick={() => void submit({ kind: 'reclassify', priority, reason: reason.trim() })} className="rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100 disabled:opacity-50">Salvar prioridade</button>
      </div>}

      {detail.actions.canAdminister && <div className="space-y-3 border-t border-red-400/20 pt-4">
        <h3 className="text-sm font-semibold text-red-200">Excluir logicamente</h3>
        <p className="text-xs text-slate-300">A ocorrência e a foto serão preservadas. Um Administrador poderá restaurar o registro na visão de excluídas.</p>
        <label className="block space-y-1 text-sm text-slate-200">
          <span>Justificativa obrigatória <span aria-hidden="true" className="text-red-400">*</span></span>
          <textarea required minLength={10} maxLength={500} rows={2} value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button type="button" disabled={saving} onClick={() => void submit({ kind: 'delete', reason: deletionReason.trim() })} className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-100 disabled:opacity-50">Excluir ocorrência</button>
      </div>}


      {message && <p role={conflict ? 'alert' : 'status'} className={conflict ? 'text-sm text-amber-200' : 'text-sm text-slate-200'}>{message}</p>}
      {conflict && <button type="button" disabled={saving} onClick={() => void reloadAfterConflict()} className="rounded-lg border border-amber-400/40 px-3 py-2 text-sm text-amber-100 disabled:opacity-50">Atualizar estado atual</button>}
    </section>
  );
}
