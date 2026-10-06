import type { ButtonHTMLAttributes } from 'react';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  loading?: boolean;
  loadingLabel?: string;
};
const variants = { primary: 'btn-primary', secondary: 'btn-secondary', text: 'btn-text', danger: 'btn-danger' } as const;

export function Button({ variant = 'primary', loading = false, loadingLabel = 'Salvando…', disabled, children, className = '', type = 'button', ...props }: ButtonProps) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`btn ${variants[variant]} ${className}`}>
    {loading ? loadingLabel : children}
  </button>;
}
