import type { ReactNode } from 'react';
import { Ic } from './Ic';

interface TopbarProps {
  crumbs?: ReactNode[];
  actions?: ReactNode;
  search?: boolean;
}

export function Topbar({ crumbs = [], actions, search = true }: TopbarProps) {
  return (
    <header className="topbar">
      {crumbs.length > 0 && (
        <div className="crumbs">
          {crumbs.map((c, i) => (
            <span key={i} className={i === crumbs.length - 1 ? 'now' : ''}>
              {i > 0 && <span className="sep" style={{ margin: '0 8px' }}>/</span>}
              {c}
            </span>
          ))}
        </div>
      )}
      {search && (
        <label className="search">
          <Ic name="search" size={14} />
          <input placeholder="Поиск аренд, кладовок, клиентов…" />
          <span className="kbd">⌘K</span>
        </label>
      )}
      {actions && <div className="row gap-2">{actions}</div>}
    </header>
  );
}
