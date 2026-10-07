'use client';

import {Eye, EyeOff, LockKeyhole} from 'lucide-react';
import {useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';

type PrivatePhoto = {url: string; expiresAt: string};

// Render only within the authorized detail's private-data section (Ticket 05).
// The endpoint rechecks current session, capability, group and RLS on each load.
export function OccurrencePhoto({occurrenceId}: {occurrenceId: string}) {
  return <PhotoReader key={occurrenceId} occurrenceId={occurrenceId} />;
}

function PhotoReader({occurrenceId}: {occurrenceId: string}) {
  const [photo, setPhoto] = useState<PrivatePhoto | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!photo) return;
    const timer = setTimeout(() => setPhoto(null), Math.max(0, Date.parse(photo.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [photo]);

  async function load() {
    setLoading(true);
    setError('');
    setPhoto(null);

    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(occurrenceId)}/photo`, {cache: 'no-store'});
      if (!response.ok) throw new Error();

      const data = await response.json() as PrivatePhoto;
      if (typeof data.url !== 'string' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) {
        throw new Error();
      }

      setPhoto(data);
    } catch {
      setError('Foto indisponível ou acesso não autorizado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  function hide() {
    setPhoto(null);
    setError('');
  }

  return <section aria-labelledby="occurrence-photo-title" className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 id="occurrence-photo-title" className="text-lg font-semibold text-foreground">Foto da ocorrência</h2>
        <p className="mt-1 text-sm text-muted-foreground">A imagem pode ser consultada por perfis autorizados.</p>
      </div>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-subtle px-3 py-1 text-xs font-medium text-muted-foreground">
        <LockKeyhole aria-hidden="true" size={14} />
        Privada
      </span>
    </div>

    <Button
      variant="secondary"
      loading={loading}
      loadingLabel="Carregando foto…"
      aria-expanded={Boolean(photo)}
      aria-controls="occurrence-photo-preview"
      onClick={() => photo ? hide() : void load()}
    >
      {photo ? <EyeOff aria-hidden="true" size={18} /> : <Eye aria-hidden="true" size={18} />}
      {photo ? 'Ocultar foto' : 'Ver foto'}
    </Button>

    {loading && <p role="status" className="text-sm text-muted-foreground">Carregando a foto da ocorrência.</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}

    <div id="occurrence-photo-preview" hidden={!photo}>
      {photo && <div className="overflow-hidden rounded-lg border border-border bg-surface-subtle p-2 sm:p-3">
        {/* Signed URLs must bypass the public Next image optimizer/cache. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt="Foto anexada à ocorrência"
          referrerPolicy="no-referrer"
          className="mx-auto max-h-[32rem] w-full object-contain"
          onError={() => {
            setPhoto(null);
            setError('Foto indisponível. Tente carregá-la novamente.');
          }}
        />
      </div>}
    </div>
  </section>;
}
