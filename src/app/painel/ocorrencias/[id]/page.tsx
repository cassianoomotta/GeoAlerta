'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useEffect, useState } from 'react';
import {OccurrencePhoto} from '@/features/occurrences/ui/OccurrencePhoto';
import {auditActionLabel} from '@/features/audit/application/presentation';
import {PriorityBadge,StatusBadge} from '@/features/occurrences/ui/OccurrenceBadges';
import type { Priority, Status } from '@/features/occurrences/contracts';
import { transitionPresentation } from '@/features/occurrences/domain/transition-presentation';

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
  registrationChannel: 'PUBLICO' | 'MANUAL' | 'BATALHAO' | null;
  locationSource: 'GPS_NATIVO' | 'MAPA' | null;
  openedAt: string;
  updatedAt: string;
  version: number;
  classification: { zones: { id: string; name: string; version: number }[] } | null;
  events: {
    id: string; kind: string; actorId: string | null; actorName: string | null; at: string;
    changes: { type?: { from: string; to: string }; groupId?: { from: string; to: string }; priority?: { from: string; to: string } } | null;
  }[];
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
    needsMedicalSupport: boolean | null;
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
  climateEvent: { id: string; name: string; state: 'PLANEJADO' | 'EM_ANDAMENTO' | 'ENCERRADO' } | null;
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

function focusFirstInvalidControl(event: React.FormEvent<HTMLFormElement>) {
  const invalid = Array.from(event.currentTarget.elements).find((element): element is HTMLElement =>
    (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) && !element.checkValidity());
  if (!invalid) return;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  invalid.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
  invalid.focus({ preventScroll: true });
}

function registrationChannelLabel(value: OccurrenceDetail['registrationChannel']) {
  const labels: Record<string, string> = { PUBLICO: 'Cidadão', MANUAL: 'Painel', BATALHAO: 'Batalhão' };
  return value ? labels[value] ?? 'Não informada' : 'Não informada';
}

export default function OccurrenceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <OccurrenceDetailView key={id} id={id} />;
}

function OccurrenceDetailView({id}: {id: string}) {
  const [detail, setDetail] = useState<OccurrenceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<'unavailable' | 'failed' | null>(null);
  const [occurrenceTypes, setOccurrenceTypes] = useState<string[]>([]);
  const [mutationSaving, setMutationSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/core/occurrences/${encodeURIComponent(id)}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          setLoadError(response.status >= 500 ? 'failed' : 'unavailable');
          return null;
        }
        return await response.json() as OccurrenceDetail;
      })
      .then((value) => { if(value) setDetail(value); })
      .catch(() => {
        if (!controller.signal.aborted) setLoadError('failed');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/core/public/occurrence-types', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => response.ok ? await response.json() as { types?: string[] } : null)
      .then((result) => { if (result?.types) setOccurrenceTypes(result.types); })
      .catch(() => { /* A ocorrência continua disponível mesmo se o catálogo não puder carregar. */ });
    return () => controller.abort();
  }, []);

  async function reloadDetail() {
    const response = await fetch(`/api/core/occurrences/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) return false;
    setDetail(await response.json() as OccurrenceDetail);
    return true;
  }

  if (loading) {
    return <main className="mx-auto w-full max-w-5xl p-4 text-muted-foreground" role="status">Carregando ocorrência…</main>;
  }

  if (!detail) {
    const unavailable = loadError !== 'failed';
    return (
      <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" aria-labelledby="occurrence-unavailable-title">
        <Link className="text-sm font-medium text-primary hover:text-primary" href="/painel/ocorrencias">← Voltar para ocorrências</Link>
        <section className="glass-card p-6 sm:p-8">
          <h1 id="occurrence-unavailable-title" className="text-xl font-bold text-foreground">{unavailable?'Ocorrência indisponível':'Falha ao carregar ocorrência'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{unavailable?'Não foi possível localizar esta ocorrência ou você não tem acesso a ela.':'O serviço não conseguiu carregar os dados agora. Tente novamente.'}</p>
          {!unavailable&&<button type="button" onClick={()=>window.location.reload()} className="mt-4 rounded-lg border border-control-border px-3 py-2 text-sm text-foreground">Tentar novamente</button>}
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 sm:p-6" aria-labelledby="occurrence-detail-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link className="text-sm font-medium text-primary hover:text-primary" href="/painel/ocorrencias">← Voltar para ocorrências</Link>
        {detail.actions.canOperate && <button type="submit" form="occurrence-edit-form" disabled={mutationSaving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutationSaving ? 'Salvando…' : 'Salvar edição'}</button>}
      </div>
      <header className="glass-card p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Protocolo {detail.protocol}</p>
        <h1 id="occurrence-detail-title" className="mt-2 text-2xl font-bold text-foreground">{detail.type}</h1>
        <div className="mt-4 flex flex-wrap gap-3"><PriorityBadge priority={detail.priority}/><StatusBadge status={detail.status.code} label={detail.status.label}/></div>
      </header>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-citizen-title">
        <h2 id="occurrence-citizen-title" className="text-lg font-semibold text-foreground">Informações do cidadão</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {detail.privateData ? <>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nome</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.privateData.reporterName)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contato</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.privateData.reporterContact)}</dd></div>
            <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Foto</dt><dd className="mt-1 text-sm text-foreground">{detail.privateData.hasPhoto ? 'Anexada' : 'Não informada'}</dd></div>
          </> : <div className="sm:col-span-2"><p className="text-sm text-muted-foreground">Dados pessoais disponíveis somente para perfis autorizados.</p></div>}
        </dl>
      </section>

      {detail.actions.canOperate && <OccurrenceMutationControls key={`${detail.id}:${detail.version}`} detail={detail} occurrenceTypes={occurrenceTypes} onReload={reloadDetail} onSavingChange={setMutationSaving} />}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-information-title">
        <h2 id="occurrence-information-title" className="text-lg font-semibold text-foreground">Informações da ocorrência</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</dt><dd className="mt-1 text-sm text-foreground">{detail.type}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Protocolo</dt><dd className="mt-1 text-sm text-foreground">{detail.protocol}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</dt><dd className="mt-1 text-sm text-foreground">{detail.status.label}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Prioridade</dt><dd className="mt-1 text-sm text-foreground">{detail.priority}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grupo responsável</dt><dd className="mt-1 text-sm text-foreground">{detail.group.name}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Evento climático</dt><dd className="mt-1 text-sm text-foreground">{detail.climateEvent ? `${detail.climateEvent.name} · ${detail.climateEvent.state.replaceAll('_', ' ')}` : 'Sem evento'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Origem do registro</dt><dd className="mt-1 text-sm text-foreground">{registrationChannelLabel(detail.registrationChannel)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Abertura</dt><dd className="mt-1 text-sm text-foreground">{formatDate(detail.openedAt)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Última atualização</dt><dd className="mt-1 text-sm text-foreground">{formatDate(detail.updatedAt)}</dd></div>
          <div className="sm:col-span-2"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição do cidadão</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-foreground">{detail.description || 'Sem descrição informada.'}</dd></div>
        </dl>
        <h3 className="mt-6 text-sm font-semibold text-foreground">Localização informada</h3>
        {detail.address && <p className="mt-3 text-sm text-foreground"><strong>Endereço:</strong> {detail.address}</p>}
        {detail.position ? (
          <div className="mt-4 grid gap-3 text-sm text-foreground sm:grid-cols-3">
            <p>Latitude: {formatCoordinate(detail.position.latitude)}</p>
            <p>Longitude: {formatCoordinate(detail.position.longitude)}</p>
            <p>Precisão: {detail.position.accuracy === null ? 'Indisponível' : `${formatCoordinate(detail.position.accuracy)} m`}</p>
            <p>Origem da localização: {detail.locationSource === 'MAPA' ? 'Ponto confirmado no mapa' : detail.locationSource === 'GPS_NATIVO' ? 'GPS do dispositivo' : 'Não informada'}</p>
          </div>
        ) : <p className="mt-3 text-sm text-muted-foreground">Localização indisponível</p>}
        <h3 className="mt-6 text-sm font-semibold text-foreground">Classificação na abertura</h3>
        {detail.classification?.zones.length ? (
          <ul className="mt-4 space-y-2 text-sm text-foreground">
            {detail.classification.zones.map((zone) => (
              <li key={`${zone.id}:${zone.version}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3">
                <span>{zone.name}</span><span className="text-muted-foreground">Versão {zone.version}</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-3 text-sm text-muted-foreground">Nenhuma zona registrada na abertura.</p>}
      </section>

      {detail.privateData?.hasPhoto && <section className="glass-card p-5 sm:p-7" aria-label="Foto da ocorrência">
        <OccurrencePhoto occurrenceId={detail.id} />
      </section>}

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-triage-title">
        <h2 id="occurrence-triage-title" className="text-lg font-semibold text-foreground">Impactos e triagem</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instituição que registrou</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.occurrenceContext.registeringInstitution?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bairro</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.occurrenceContext.neighborhood?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Localidade</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.occurrenceContext.locality?.label)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Situação</dt><dd className="mt-1 text-sm text-foreground">{detail.triage.situation === 'EM_RISCO' ? 'Em risco de ocorrer' : detail.triage.situation === 'JA_OCORREU' ? 'Já ocorreu' : 'Não informado'}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Local/estrutura atingida</dt><dd className="mt-1 text-sm text-foreground">{displayValue(detail.triage.damageLocation?.label)}{detail.triage.damageLocation?.detail ? ` — ${detail.triage.damageLocation.detail}` : ''}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vítimas</dt><dd className="mt-1 text-sm text-foreground">{displayBoolean(detail.triage.hasVictims)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Desabrigados/desalojados</dt><dd className="mt-1 text-sm text-foreground">{displayBoolean(detail.triage.hasDisplaced)}</dd></div>
          <div><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Apoio médico</dt><dd className="mt-1 text-sm text-foreground">{displayBoolean(detail.triage.needsMedicalSupport)}</dd></div>
        </dl>
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-attendance-title">
        <h2 id="occurrence-attendance-title" className="text-lg font-semibold text-foreground">Atendimento e ações</h2>
        {detail.serviceRecords.length ? (
          <ol aria-label="Registros de atendimento" className="mt-4 space-y-0 border-l border-border pl-5">
            {detail.serviceRecords.map((record) => (
              <li key={record.id} className="relative border-b border-border py-4 last:border-b-0">
                <span aria-hidden="true" className="absolute -left-[1.58rem] top-5 h-2 w-2 rounded-full bg-success text-success-foreground" />
                <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">{record.agency.label}</h3><time className="text-xs text-muted-foreground" dateTime={record.attendedAt}>{formatDate(record.attendedAt)}</time></div>
                <p className="mt-1 text-xs text-muted-foreground">Responsável: {record.attendingPerson}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{record.action}</p>
                {record.outcome && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground"><strong>Resultado:</strong> {record.outcome}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Reforço solicitado: {record.reinforcementRequested ? 'Sim' : 'Não'}</p>
                {record.correctionReason && <p className="mt-2 text-xs text-warning">Correção deste registro: {record.correctionReason}</p>}
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-muted-foreground">Nenhuma ação de atendimento registrada.</p>}
        {detail.actions.canOperate && <ServiceRecordForm key={`${detail.id}:${detail.version}`} detail={detail} onReload={reloadDetail} />}
      </section>

      <section className="glass-card p-5 sm:p-7" aria-labelledby="occurrence-history-title">
        <h2 id="occurrence-history-title" className="text-lg font-semibold text-foreground">Histórico técnico</h2>
        {detail.events.length ? (
          <ol aria-label="Histórico" className="mt-4 space-y-0 border-l border-border pl-5">
            {detail.events.map((event) => (
              <li key={event.id} className="relative border-b border-border py-3 last:border-b-0">
                <span aria-hidden="true" className="absolute -left-[1.58rem] top-4 h-2 w-2 rounded-full bg-primary text-primary-foreground" />
                <p className="text-sm font-medium text-foreground">{auditActionLabel(event.kind)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Por {event.actorName || 'Sistema'}</p>
                {(event.kind === 'OCCURRENCE_EDITED' || event.kind === 'PRIORITY_RECLASSIFIED') && event.changes && <ul aria-label="Campos alterados" className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {event.changes.type && <li><span className="font-medium text-foreground">Tipo/categoria:</span> {event.changes.type.from} → {event.changes.type.to}</li>}
                  {event.changes.groupId && <li><span className="font-medium text-foreground">Grupo responsável:</span> {event.changes.groupId.from} → {event.changes.groupId.to}</li>}
                  {event.changes.priority && <li><span className="font-medium text-foreground">Prioridade:</span> {event.changes.priority.from === 'ALTA' ? 'Alta' : 'Normal'} → {event.changes.priority.to === 'ALTA' ? 'Alta' : 'Normal'}</li>}
                </ul>}
                <time className="mt-1 block text-xs text-muted-foreground" dateTime={event.at}>{formatDate(event.at)}</time>
              </li>
            ))}
          </ol>
        ) : <p className="mt-3 text-sm text-muted-foreground">Nenhum evento registrado.</p>}
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agencyCode, attendingPerson, attendedAt: new Date(attendedAt).toISOString(), action, outcome: outcome.trim() || null, reinforcementRequested }),
      });
      const result = await response.json() as { error?: { message?: string } };
      if (!response.ok) { setMessage(result.error?.message ?? 'Não foi possível salvar o atendimento. Os dados preenchidos foram mantidos.'); return; }
      if (!await onReload()) { setMessage('Atendimento salvo. Atualize a página para consultar o novo registro.'); return; }
      setAttendingPerson(''); setAction(''); setOutcome(''); setReinforcementRequested(false);
      setMessage('Registro de atendimento salvo.');
    } catch {
      setMessage('Falha de comunicação. Confira o registro antes de tentar novamente; os dados preenchidos foram mantidos.');
    } finally { setSaving(false); }
  }

  return (
    <form className="mt-6 space-y-4 border-t border-border pt-5" onSubmit={submit} aria-labelledby="service-record-form-title">
      <div>
        <h3 id="service-record-form-title" className="text-base font-semibold text-foreground">Registrar ação de atendimento</h3>
        <p className="mt-1 text-xs text-muted-foreground">Cada envio acrescenta um registro ao histórico; registros anteriores são preservados.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-foreground">
          <span>Órgão responsável <span aria-hidden="true" className="text-danger">*</span></span>
          <select required disabled={saving} value={agencyCode} onChange={(event) => setAgencyCode(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50">
            {detail.serviceAgencyOptions.map((agency) => <option key={agency.code} value={agency.code}>{agency.label}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span>Agente ou responsável <span aria-hidden="true" className="text-danger">*</span></span>
          <input required disabled={saving} maxLength={160} value={attendingPerson} onChange={(event) => setAttendingPerson(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50" />
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span>Data e hora do atendimento <span aria-hidden="true" className="text-danger">*</span></span>
          <input required disabled={saving} type="datetime-local" value={attendedAt} onChange={(event) => setAttendedAt(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50" />
        </label>
        <label className="space-y-1 text-sm text-foreground sm:col-span-2">
          <span>Ação realizada <span aria-hidden="true" className="text-danger">*</span></span>
          <textarea required disabled={saving} minLength={1} maxLength={4000} rows={4} value={action} onChange={(event) => setAction(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50" />
        </label>
        <label className="space-y-1 text-sm text-foreground sm:col-span-2">
          <span>Resultado ou observações</span>
          <textarea disabled={saving} maxLength={4000} rows={3} value={outcome} onChange={(event) => setOutcome(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50" />
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
          <input disabled={saving} type="checkbox" checked={reinforcementRequested} onChange={(event) => setReinforcementRequested(event.target.checked)} className="h-4 w-4 rounded border-control-border bg-background text-primary" />
          Foi solicitado reforço
        </label>
      </div>
      <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">{saving ? 'Salvando…' : 'Salvar atendimento'}</button>
      {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    </form>
  );
}

function OccurrenceMutationControls({
  detail,
  occurrenceTypes,
  onReload,
  onSavingChange,
}: {
  detail: OccurrenceDetail;
  occurrenceTypes: string[];
  onReload: () => Promise<boolean>;
  onSavingChange: (saving: boolean) => void;
}) {
  const router = useRouter();
  const [type, setType] = useState(detail.type);
  const [groupId, setGroupId] = useState(detail.group.id);
  const [transitionReason, setTransitionReason] = useState('');
  const [priorityReason, setPriorityReason] = useState('');
  const [selectedTransition, setSelectedTransition] = useState<Status | null>(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [priority, setPriority] = useState<Priority>(detail.priority);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [conflict, setConflict] = useState(false);

  async function submit(command: Record<string, unknown>) {
    setSaving(true);
    onSavingChange(true);
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
      setMessage(refreshed ? (command.kind === 'edit' ? 'Edição salva.' : 'Alteração salva.') : 'Alteração salva. Atualize o detalhe para ver o estado atual.');
    } catch {
      setMessage('Falha de comunicação. Verifique o estado atual antes de tentar novamente.');
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = {
      kind: 'edit',
      ...(type.trim() !== detail.type ? { type: type.trim() } : {}),
      ...(groupId !== detail.group.id ? { groupId } : {}),
    };
    if (Object.keys(command).length === 1) {
      setMessage('Faça ao menos uma alteração antes de salvar.');
      return;
    }
    await submit(command);
  }

  async function submitPriority(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submit({ kind: 'reclassify', priority, reason: priorityReason.trim() });
  }

  async function reloadAfterConflict() {
    setSaving(true);
    onSavingChange(true);
    try {
      const refreshed = await onReload();
      setConflict(false);
      setMessage(refreshed ? 'Estado atual carregado. Confira os valores antes de salvar novamente.' : 'Não foi possível atualizar. Tente novamente.');
    } finally {
      setSaving(false);
      onSavingChange(false);
    }
  }

  return (
    <section className="glass-card space-y-5 p-5 sm:p-7" aria-labelledby="occurrence-mutation-title">
      <div>
        <h2 id="occurrence-mutation-title" className="text-lg font-semibold text-foreground">Editar e atualizar ocorrência</h2>
        <p className="mt-1 text-xs text-muted-foreground">Versão {detail.version}. Alterações concorrentes exigem atualização antes de salvar novamente.</p>
      </div>
      <form id="occurrence-edit-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submitEdit} onInvalid={focusFirstInvalidControl}>
        <label className="space-y-1 text-sm text-foreground">
          <span>Tipo / categoria <span aria-hidden="true" className="text-danger">*</span></span>
          <select required disabled={saving} value={type} onChange={(event) => setType(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50">
            {[...new Set([detail.type, ...occurrenceTypes])].map((option) => <option key={option} value={option}>{option}{option === detail.type && !occurrenceTypes.includes(option) ? ' (indisponível para novos registros)' : ''}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-foreground">
          <span>Grupo responsável <span aria-hidden="true" className="text-danger">*</span></span>
          <select required disabled={saving} value={groupId} onChange={(event) => setGroupId(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50">
            {detail.availableGroups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <div className="space-y-1 text-sm text-foreground sm:col-span-2">
          <span className="font-medium">Descrição original (relato do cidadão)</span>
          <p className="min-h-12 whitespace-pre-wrap rounded-lg border border-border bg-surface-subtle px-3 py-2">{detail.description || 'Sem descrição informada.'}</p>
        </div>
      </form>

      {detail.actions.availableTransitions.length > 0 && <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Mudar status da ocorrência</h3>
        <label className="block space-y-1 text-sm text-foreground">
          <span>Status</span>
          <select aria-label="Mudar status da ocorrência" value={selectedTransition ?? ''} disabled={saving} onChange={(event) => { setSelectedTransition(event.target.value ? event.target.value as Status : null); setTransitionReason(''); }} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50">
            <option value="">Selecione um status</option>
            {(Object.keys(statusLabels) as Status[]).map((status) => {
              const available = detail.actions.availableTransitions.some((transition) => transition.target === status);
              return <option key={status} value={status} disabled={!available}>{statusLabels[status]}{!available ? ' · indisponível' : ''}</option>;
            })}
          </select>
          <span className="block text-xs text-muted-foreground">Os status indisponíveis não são permitidos para esta ocorrência.</span>
        </label>
        {selectedTransition && detail.actions.availableTransitions.some((transition) => transition.target === selectedTransition && transition.reasonRequired) && <div className="space-y-2 rounded-lg border border-warning/30 bg-warning-soft p-3">
          <label className="block space-y-1 text-sm text-foreground">
            <span>Justificativa obrigatória para {transitionPresentation(selectedTransition, statusLabels[selectedTransition]).label} <span aria-hidden="true" className="text-danger">*</span></span>
            <textarea autoFocus required minLength={10} maxLength={500} rows={2} value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground" />
          </label>
        </div>}
        {selectedTransition && (() => {
          const transition = detail.actions.availableTransitions.find((candidate) => candidate.target === selectedTransition)!;
          const presentation = transitionPresentation(selectedTransition, statusLabels[selectedTransition]);
          const tone = presentation.tone === 'danger' ? 'border-danger/30 bg-danger-soft text-danger' : presentation.tone === 'info' ? 'border-info/30 bg-info-soft text-info' : 'border-primary/30 bg-primary-soft text-primary';
          return <div className="flex flex-wrap gap-2">
            <button type="button" disabled={saving || (transition.reasonRequired && transitionReason.trim().length < 10)} onClick={() => void submit({ kind: 'transition', target: selectedTransition, ...(transition.reasonRequired ? { reason: transitionReason.trim() } : {}) })} className={`rounded-lg border px-3 py-2 text-sm font-medium disabled:opacity-50 ${tone}`}>
              Confirmar mudança para {statusLabels[selectedTransition]}
            </button>
            <button type="button" disabled={saving} onClick={() => { setSelectedTransition(null); setTransitionReason(''); }} className="rounded-lg border border-control-border px-3 py-2 text-sm text-foreground">Limpar seleção</button>
          </div>;
        })()}
      </div>}

      {detail.actions.canReclassify && <form onSubmit={submitPriority} className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Reclassificar prioridade</h3>
        <label className="block space-y-1 text-sm text-foreground">
          <span>Nova prioridade {priority !== detail.priority && <span aria-hidden="true" className="text-danger">*</span>}</span>
          <select required disabled={saving} value={priority} onChange={(event) => setPriority(event.target.value as Priority)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50">
            <option value="NORMAL">Normal</option>
            <option value="ALTA">Alta</option>
          </select>
        </label>
        <label className="block space-y-1 text-sm text-foreground">
          <span>Justificativa obrigatória {priority !== detail.priority && <span aria-hidden="true" className="text-danger">*</span>}</span>
          <textarea required={priority !== detail.priority} disabled={saving} minLength={10} maxLength={500} rows={2} value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground disabled:opacity-50" />
        </label>
        <button disabled={saving || priority === detail.priority} className="rounded-lg border border-control-border px-3 py-2 text-sm text-foreground disabled:opacity-50">Salvar correção</button>
      </form>}

      {detail.actions.canAdminister && <div className="space-y-3 border-t border-danger/30 pt-4">
        <h3 className="text-sm font-semibold text-danger">Excluir ocorrência</h3>
        <p className="text-xs text-muted-foreground">A ocorrência e a foto serão preservadas. Um Administrador poderá restaurar o registro na visão de excluídas.</p>
        <label className="block space-y-1 text-sm text-foreground">
          <span>Justificativa obrigatória <span aria-hidden="true" className="text-danger">*</span></span>
          <textarea required minLength={10} maxLength={500} rows={2} value={deletionReason} onChange={(event) => setDeletionReason(event.target.value)} className="w-full rounded-lg border border-control-border bg-background px-3 py-2 text-foreground" />
        </label>
        <button type="button" disabled={saving} onClick={() => void submit({ kind: 'delete', reason: deletionReason.trim() })} className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2 text-sm text-danger disabled:opacity-50">Excluir ocorrência</button>
      </div>}


      {message && <p role={conflict ? 'alert' : 'status'} className={conflict ? 'text-sm text-warning' : 'text-sm text-foreground'}>{message}</p>}
      {conflict && <button type="button" disabled={saving} onClick={() => void reloadAfterConflict()} className="rounded-lg border border-warning/30 px-3 py-2 text-sm text-warning disabled:opacity-50">Atualizar estado atual</button>}
    </section>
  );
}
