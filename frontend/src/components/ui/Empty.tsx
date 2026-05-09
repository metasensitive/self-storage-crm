import type { ReactNode } from 'react';

interface EmptyProps {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
}

export function Empty({ title, hint, action }: EmptyProps) {
  return (
    <div className="empty">
      <div className="h-2" style={{ color: 'var(--ink-2)' }}>
        {title}
      </div>
      {hint && <div className="t-small mt-2">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
