import type { ReactNode } from 'react';

export function PageHeader({ title, description, action, id }: { title: string; description?: string; action?: ReactNode; id?: string }) {
  return <header className="flex flex-wrap items-start justify-between gap-4">
    <div className="min-w-0"><h1 id={id} className="text-2xl font-semibold text-foreground">{title}</h1>{description && <p className="mt-2 max-w-[70ch] text-sm text-muted-foreground">{description}</p>}</div>
    {action}
  </header>;
}
