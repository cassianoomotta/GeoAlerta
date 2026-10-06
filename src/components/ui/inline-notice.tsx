import { CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Tone } from './badge';

const appearances = {
  neutral: 'bg-surface-subtle text-foreground', danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning', success: 'bg-success-soft text-success', info: 'bg-info-soft text-info',
};

export function InlineNotice({ tone = 'info', children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { tone?: Tone }) {
  const Icon = tone === 'success' ? CircleCheck : tone === 'danger' || tone === 'warning' ? TriangleAlert : Info;
  return <div {...props} className={`flex items-start gap-3 rounded-md p-4 text-sm ${appearances[tone]} ${className}`}>
    <Icon size={20} aria-hidden="true" className="mt-0.5 shrink-0" /><div className="min-w-0">{children}</div>
  </div>;
}
