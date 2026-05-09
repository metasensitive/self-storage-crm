import type { ReactNode } from 'react';

interface TopbarProps {
  crumbs?: ReactNode[];
  actions?: ReactNode;
}

export function Topbar({ crumbs = [], actions }: TopbarProps) {
  return (
    <header className="topbar">
      {crumbs.length > 0 && (
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'now' : ''}>
              {i > 0 && (
                <span className="sep" style={{ margin: '0 8px' }}>
                  /
                </span>
              )}
              {c}
            </span>
          ))}
        </div>
      )}
      <div style={{ marginLeft: 'auto' }} />
      {actions && <div className="row gap-2">{actions}</div>}
    </header>
  );
}
