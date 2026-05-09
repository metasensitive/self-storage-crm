import type { ReactNode } from 'react';
import { Topbar } from '@/components/Topbar';

interface PlaceholderProps {
  title: string;
  crumbs?: ReactNode[];
  description?: string;
}

export function Placeholder({ title, crumbs, description }: PlaceholderProps) {
  return (
    <>
      <Topbar crumbs={crumbs ?? [title]} />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">В разработке</span>
            <h1 className="h-display">{title}</h1>
            {description && <span className="muted t-body">{description}</span>}
          </div>
        </div>
        <div className="empty mt-4">
          <div className="h-2" style={{ color: 'var(--ink-2)' }}>
            Экран будет реализован в следующих этапах.
          </div>
          <div className="t-small mt-2">Каркас приложения и роутинг — на месте.</div>
        </div>
      </div>
    </>
  );
}
