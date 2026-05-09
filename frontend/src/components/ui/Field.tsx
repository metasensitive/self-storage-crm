import type { ReactNode } from 'react';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <label className="field">
      {label && <span>{label}</span>}
      {children}
      {error ? (
        <span className="t-small" style={{ color: 'var(--st-blocked)' }}>
          {error}
        </span>
      ) : (
        hint && <span className="t-small">{hint}</span>
      )}
    </label>
  );
}
