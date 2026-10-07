import { Circle, CircleCheck, Clock, CircleX, Activity, TriangleAlert } from 'lucide-react';
import { Badge, type Tone } from '@/components/ui/badge';
import type { Priority, Status } from '../contracts';

const statusAppearance = {
  NOVA: { tone: 'neutral', Icon: Circle }, EM_TRIAGEM: { tone: 'warning', Icon: Clock },
  EM_ATENDIMENTO: { tone: 'info', Icon: Activity }, RESOLVIDA: { tone: 'success', Icon: CircleCheck },
  CANCELADA: { tone: 'danger', Icon: CircleX },
} satisfies Record<Status, { tone: Tone; Icon: typeof Circle }>;

export function StatusBadge({ status, label }: { status: Status; label: string }) {
  const { tone, Icon } = statusAppearance[status];
  return <Badge tone={tone} className={status === 'EM_ATENDIMENTO' ? 'max-w-none whitespace-nowrap' : ''} icon={<Icon size={16} />}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <Badge tone={priority === 'ALTA' ? 'danger' : 'neutral'} icon={priority === 'ALTA' ? <TriangleAlert size={16} /> : <Circle size={16} />}>
    Prioridade {priority === 'ALTA' ? 'alta' : 'normal'}
  </Badge>;
}
