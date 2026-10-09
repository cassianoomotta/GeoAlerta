import type { Status } from '../contracts';

export type TransitionTone = 'info' | 'danger' | 'primary';

export function transitionPresentation(target: Status, label: string): { label: string; tone: TransitionTone } {
  if (target === 'EM_TRIAGEM') return { label: 'Enviar para triagem', tone: 'info' };
  if (target === 'CANCELADA') return { label: 'Cancelar ocorrência', tone: 'danger' };
  return { label: `Marcar como ${label}`, tone: 'primary' };
}
