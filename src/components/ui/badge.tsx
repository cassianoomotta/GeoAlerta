import type { HTMLAttributes, ReactNode } from 'react';

export type Tone = 'neutral' | 'danger' | 'warning' | 'success' | 'info';
const tones: Record<Tone, string> = {
  neutral: 'bg-surface-subtle text-foreground',
  danger: 'bg-danger-soft text-danger',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
};

export function Badge({ tone = 'neutral', icon, children, className = '', ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone; icon?: ReactNode }) {
  return <span {...props} className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium ${tones[tone]} ${className}`}>
    {icon && <span aria-hidden="true" className="shrink-0">{icon}</span>}{children}
  </span>;
}
