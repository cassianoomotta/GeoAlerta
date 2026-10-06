'use client';

import { useEffect, useState } from 'react';
import type { Status } from '../contracts';

const defaults: Record<Status, string> = {
  NOVA: 'Nova', EM_TRIAGEM: 'Em triagem', EM_ATENDIMENTO: 'Em atendimento', RESOLVIDA: 'Resolvida', CANCELADA: 'Cancelada',
};

export function useStatusLabels() {
  const [labels, setLabels] = useState(defaults);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/core/status-presentations', { cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then((body: { items: { code: Status; label: string }[] }) => {
        if (!controller.signal.aborted) setLabels({ ...defaults, ...Object.fromEntries(body.items.map(item => [item.code, item.label])) });
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  return labels;
}
