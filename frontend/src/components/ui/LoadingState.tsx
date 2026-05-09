interface LoadingStateProps {
  label?: string;
  inline?: boolean;
}

export function LoadingState({ label = 'Загрузка…', inline }: LoadingStateProps) {
  if (inline) {
    return <span className="t-small dim">{label}</span>;
  }
  return (
    <div className="empty">
      <div className="h-2" style={{ color: 'var(--ink-2)' }}>
        {label}
      </div>
    </div>
  );
}
