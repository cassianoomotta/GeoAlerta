'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import type { OpenResult } from '../contracts';
import type { BattalionMapPoint } from './BattalionLocationMap';

const BattalionLocationMap = dynamic(() => import('./BattalionLocationMap'), {
  ssr: false,
  loading: () => <div className="h-72 animate-pulse rounded-xl border border-control-border bg-surface-subtle sm:h-96" role="status">Carregando mapa…</div>,
});

type ApiError = { error?: { message?: string } };
type BattalionRequest = {
  type: string;
  address: string;
  description: string;
  needsMedicalSupport: boolean;
  reporterName: string;
  reporterContact: string;
  position: BattalionMapPoint & { confirmed: true };
};

export function BattalionOccurrenceForm({ types }: { types: string[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);
  const [point, setPoint] = useState<BattalionMapPoint | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [medical, setMedical] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageRole, setMessageRole] = useState<'status' | 'alert'>('status');
  const [created, setCreated] = useState<OpenResult | null>(null);

  function changePoint(next: BattalionMapPoint) {
    setPoint(next);
    setConfirmed(false);
    setCreated(null);
    setMessage('O ponto mudou. Confirme novamente a localização no mapa.');
    setMessageRole('status');
  }

  function confirmPoint() {
    if (!point) return;
    setConfirmed(true);
    setCreated(null);
    setMessage('Localização confirmada.');
    setMessageRole('status');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(null);
    if (!point || !confirmed) {
      setMessageRole('alert');
      setMessage('Posicione o marcador e confirme a localização antes de registrar.');
      return;
    }
    if (medical === null) {
      setMessageRole('alert');
      setMessage('Informe se há necessidade de apoio médico.');
      return;
    }
    const values = new FormData(event.currentTarget);
    const request: BattalionRequest = {
      type: String(values.get('type') ?? ''),
      address: String(values.get('address') ?? ''),
      description: String(values.get('description') ?? ''),
      needsMedicalSupport: medical,
      reporterName: String(values.get('reporterName') ?? ''),
      reporterContact: String(values.get('reporterContact') ?? ''),
      position: { ...point, confirmed: true },
    };
    const signature = JSON.stringify(request);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setPending(true);
    setMessage('Registrando ocorrência…');
    setMessageRole('status');
    try {
      const response = await fetch('/api/core/occurrences/battalion', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': attempt.current.key },
        body: signature,
      });
      const result = await response.json() as OpenResult | ApiError;
      if (!response.ok) {
        setMessageRole('alert');
        setMessage((result as ApiError).error?.message ?? 'Não foi possível registrar a ocorrência. Confira os dados e tente novamente.');
        return;
      }
      attempt.current = null;
      setCreated(result as OpenResult);
      setMessage('Ocorrência registrada.');
      formRef.current?.reset();
      setMedical(null);
      setPoint(null);
      setConfirmed(false);
    } catch {
      setMessageRole('alert');
      setMessage('Não foi possível confirmar o registro. Tente novamente sem alterar os dados.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={submit} aria-busy={pending} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-foreground">
          <span className="inline-flex items-baseline gap-1">Tipo <span aria-hidden="true" className="text-danger">*</span></span>
          <select className="rounded border border-control-border bg-surface p-2 text-foreground" name="type" required defaultValue="" disabled={pending || !types.length}>
            <option value="" disabled>Selecione o tipo</option>{types.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-foreground">
          <span className="inline-flex items-baseline gap-1">Endereço ou referência <span aria-hidden="true" className="text-danger">*</span></span>
          <input className="rounded border border-control-border bg-surface p-2 text-foreground" name="address" required minLength={1} maxLength={300} autoComplete="street-address" placeholder="Rua, número ou ponto de referência" disabled={pending} />
        </label>
      </div>
      <label className="grid gap-1 text-sm text-foreground">
        <span className="inline-flex items-baseline gap-1">Descrição curta <span aria-hidden="true" className="text-danger">*</span></span>
        <textarea className="min-h-24 rounded border border-control-border bg-surface p-2 text-foreground" name="description" required minLength={1} maxLength={500} disabled={pending} />
        <span className="text-xs text-muted-foreground">Até 500 caracteres.</span>
      </label>
      <fieldset className="grid gap-2 text-sm text-foreground">
        <legend>Há necessidade de apoio médico? <span aria-hidden="true" className="text-danger">*</span></legend>
        <div className="flex flex-wrap gap-5">
          <label className="inline-flex items-center gap-2"><input type="radio" name="needsMedicalSupport" checked={medical === true} onChange={() => setMedical(true)} disabled={pending} />Sim</label>
          <label className="inline-flex items-center gap-2"><input type="radio" name="needsMedicalSupport" checked={medical === false} onChange={() => setMedical(false)} disabled={pending} />Não</label>
        </div>
      </fieldset>
      <fieldset className="grid gap-3 text-sm text-foreground">
        <legend>Localização da ocorrência <span aria-hidden="true" className="text-danger">*</span></legend>
        <p className="text-muted-foreground">Clique no mapa para posicionar o marcador. Você também pode arrastá-lo para ajustar o ponto.</p>
        <BattalionLocationMap point={point} onChange={changePoint} />
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={confirmPoint} disabled={pending || !point} className="rounded border border-control-border px-4 py-2 font-medium text-foreground hover:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-50">Confirmar ponto no mapa</button>
          <span role="status" className="text-muted-foreground">{confirmed ? 'Ponto confirmado' : point ? 'Confirmação necessária após posicionar o marcador' : 'Nenhum ponto posicionado'}</span>
        </div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm text-foreground">Nome de contato (opcional)
          <input className="rounded border border-control-border bg-surface p-2 text-foreground" name="reporterName" maxLength={120} disabled={pending} />
        </label>
        <label className="grid gap-1 text-sm text-foreground">Contato (opcional)
          <input className="rounded border border-control-border bg-surface p-2 text-foreground" name="reporterContact" maxLength={40} disabled={pending} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending || !confirmed || medical === null || !types.length} className="rounded bg-primary px-4 py-2 font-semibold text-primary-foreground hover:bg-primary disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? 'Registrando…' : 'Registrar ocorrência'}
        </button>
        <Link className="text-sm text-primary underline underline-offset-4" href="/painel/ocorrencias">Voltar para ocorrências</Link>
      </div>
      {message && <p role={messageRole} aria-live={messageRole === 'alert' ? 'assertive' : 'polite'} className="text-sm text-foreground">{message}</p>}
      {created && <p className="text-sm font-medium text-success">Protocolo {created.protocol}.{' '}
        <Link className="underline underline-offset-4" href={`/painel/ocorrencias/${created.id}`}>Abrir ocorrência</Link>
      </p>}
    </form>
  );
}
