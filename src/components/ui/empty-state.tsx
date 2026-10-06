import type { ReactNode } from 'react';

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="space-y-3 py-8" role="status">
    <p className="font-medium">{title}</p><p className="max-w-[70ch] text-sm text-muted-foreground">{description}</p>{action}
  </div>;
}
