'use client';
import {useEffect, useState} from 'react';
// Render only within the authorized detail's private-data section (Ticket 05).
// The endpoint rechecks current session, capability, group and RLS on each load.
export function OccurrencePhoto({occurrenceId}: {occurrenceId: string}) {
  return <PhotoReader key={occurrenceId} occurrenceId={occurrenceId} />;
}
function PhotoReader({occurrenceId}: {occurrenceId: string}) {
  const [photo, setPhoto] = useState<{url: string; expiresAt: string} | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!photo) return;
    const timer = setTimeout(() => setPhoto(null), Math.max(0, Date.parse(photo.expiresAt) - Date.now()));
    return () => clearTimeout(timer);
  }, [photo]);
  async function load() {
    setLoading(true); setError(''); setPhoto(null);
    try {
      const response = await fetch(`/api/core/occurrences/${encodeURIComponent(occurrenceId)}/photo`, {cache: 'no-store'});
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (typeof data.url !== 'string' || !Number.isFinite(Date.parse(data.expiresAt)) || Date.parse(data.expiresAt) <= Date.now()) throw new Error();
      setPhoto(data);
    } catch { setError('Foto indisponível ou acesso não autorizado. Tente novamente.'); }
    finally { setLoading(false); }
  }
  return <section aria-label="Foto privada">
    <button type="button" onClick={load} disabled={loading}>{loading ? 'Consultando foto...' : 'Consultar foto privada'}</button>
    {photo && <>
      {/* Signed URLs must bypass the public Next image optimizer/cache. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo.url} alt="Evidência da ocorrência" referrerPolicy="no-referrer" className="max-h-96 max-w-full" onError={() => {setPhoto(null); setError('Foto expirada ou indisponível. Consulte novamente.');}} />
      <p>Acesso temporário por até 60 segundos.</p>
    </>}
    {error && <p role="alert">{error}</p>}
  </section>;
}
