'use client';

import { useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import type { OpenResult } from '../contracts';
import { NativePositionError, readNativePosition } from './manual-position';

type GroupOption = { id: string; name: string };
type ManualRequest = {
  type: string;
  description: string;
  reporterName: string;
  reporterContact: string;
  groupId: string;
  position: { latitude: number; longitude: number; accuracy: number };
};
type ApiError = { error?: { message?: string } };

function locationErrorMessage(error: unknown) {
  if (!(error instanceof NativePositionError)) return 'Não foi possível obter a localização. Tente novamente.';
  if (error.code === 'PERMISSION_DENIED') return 'A localização foi negada. Permita o acesso à localização e tente novamente.';
  if (error.code === 'TIMEOUT') return 'A localização demorou demais. Tente obter a posição novamente.';
  return 'Este navegador não disponibiliza localização. Use um dispositivo com GPS habilitado.';
}

export function ManualOccurrenceForm({ groups }: { groups: GroupOption[] }) {
  const [position, setPosition] = useState<ManualRequest['position'] | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [messageRole, setMessageRole] = useState<'status' | 'alert'>('status');
  const [created, setCreated] = useState<OpenResult | null>(null);
  const attempt = useRef<{ signature: string; key: string } | null>(null);

  async function captureLocation() {
    setPosition(null);
    setCreated(null);
    setMessageRole('status');
    setMessage('Obtendo localização do dispositivo…');
    try {
      const nextPosition = await readNativePosition(typeof navigator === 'undefined' ? undefined : navigator.geolocation);
      setPosition(nextPosition);
      setMessage(`Localização obtida com precisão de ${Math.round(nextPosition.accuracy)} m.`);
    } catch (error) {
      setMessageRole('alert');
      setMessage(locationErrorMessage(error));
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreated(null);
    if (!position) {
      setMessageRole('alert');
      setMessage('Obtenha a localização GPS antes de registrar a ocorrência.');
      return;
    }
    const values = new FormData(event.currentTarget);
    const request: ManualRequest = {
      type: String(values.get('type') ?? ''),
      description: String(values.get('description') ?? ''),
      reporterName: String(values.get('reporterName') ?? ''),
      reporterContact: String(values.get('reporterContact') ?? ''),
      groupId: String(values.get('groupId') ?? ''),
      position,
    };
    const signature = JSON.stringify(request);
    if (attempt.current?.signature !== signature) attempt.current = { signature, key: crypto.randomUUID() };
    setPending(true);
    setMessageRole('status');
    setMessage('Registrando ocorrência…');
    try {
      const response = await fetch('/api/core/occurrences', {
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
    } catch {
      setMessageRole('alert');
      setMessage('Não foi possível confirmar o registro. Tente novamente sem alterar os dados.');
    } finally {
      setPending(false);
    }
  }

  return (
    <details className="rounded border border-slate-600 p-4">
      <summary className="cursor-pointer font-semibold text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-400">
        Registrar ocorrência manualmente
      </summary>
      <form onSubmit={submit} onChange={() => { setCreated(null); setMessage(''); }} aria-busy={pending} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="grid gap-1 text-sm text-slate-200">
          Tipo
          <input className="rounded border border-slate-600 bg-slate-900 p-2 text-white" name="type" required maxLength={80} disabled={pending} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Grupo responsável
          <select className="rounded border border-slate-600 bg-slate-900 p-2 text-white" name="groupId" required defaultValue={groups[0]?.id ?? ''} disabled={pending || !groups.length}>
            {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Nome de contato
          <input className="rounded border border-slate-600 bg-slate-900 p-2 text-white" name="reporterName" required maxLength={120} disabled={pending} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200">
          Contato
          <input className="rounded border border-slate-600 bg-slate-900 p-2 text-white" name="reporterContact" required maxLength={40} disabled={pending} />
        </label>
        <label className="grid gap-1 text-sm text-slate-200 sm:col-span-2 lg:col-span-3">
          Descrição
          <textarea className="min-h-24 rounded border border-slate-600 bg-slate-900 p-2 text-white" name="description" required maxLength={2000} disabled={pending} />
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3">
          <button type="button" onClick={captureLocation} disabled={pending} className="rounded border border-slate-500 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
            Obter localização GPS
          </button>
          {position && <span className="text-sm text-slate-300">Precisão ±{Math.round(position.accuracy)} m</span>}
          <button type="submit" disabled={pending || !position || !groups.length} className="rounded bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50">
            {pending ? 'Registrando…' : 'Registrar ocorrência'}
          </button>
        </div>
        {message && <p role={messageRole} aria-live={messageRole === 'alert' ? 'assertive' : 'polite'} className="text-sm text-slate-200 sm:col-span-2 lg:col-span-3">{message}</p>}
        {created && <p className="text-sm font-medium text-green-300 sm:col-span-2 lg:col-span-3">
          Protocolo {created.protocol} · Prioridade {created.priority === 'ALTA' ? 'alta' : 'normal'}.{' '}
          <Link className="underline underline-offset-4" href={`/painel/ocorrencias/${created.id}`}>Abrir ocorrência</Link>
        </p>}
      </form>
    </details>
  );
}
