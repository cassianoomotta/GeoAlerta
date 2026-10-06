export function Skeleton({ label = 'Carregando…', className = '' }: { label?: string; className?: string }) {
  return <div role="status" aria-busy="true" className={`rounded-md bg-surface-subtle ${className}`}><span className="sr-only">{label}</span></div>;
}
