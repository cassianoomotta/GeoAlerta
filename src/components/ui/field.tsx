'use client';

import { useId, type InputHTMLAttributes } from 'react';

export type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, id, className = '', required, 'aria-describedby': describedBy, ...props }: FieldProps) {
  const generated = useId();
  const inputId = id ?? generated;
  const descriptionId = `${inputId}-description`;
  return <div className="flex min-w-0 flex-col gap-2">
    <label htmlFor={inputId} className="form-label">{label}{required && <span className="ml-1 text-danger" aria-hidden="true">*</span>}</label>
    <input {...props} id={inputId} required={required} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={[describedBy, (error || hint) && descriptionId].filter(Boolean).join(' ') || undefined} className={`form-input ${className}`} />
    {(error || hint) && <p id={descriptionId} className={`text-sm ${error ? 'text-danger' : 'text-muted-foreground'}`}>{error || hint}</p>}
  </div>;
}
