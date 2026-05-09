import type { ReactNode } from 'react';
import { Button } from './Button';
import { isApiError } from '@/api/client';

interface ErrorStateProps {
  error: unknown;
  title?: ReactNode;
  onRetry?: () => void;
}

export function ErrorState({ error, title = 'Не удалось загрузить данные', onRetry }: ErrorStateProps) {
  const message = isApiError(error)
    ? error.body.message
    : error instanceof Error
      ? error.message
      : 'Неизвестная ошибка';

  return (
    <div className="empty">
      <div className="h-2" style={{ color: 'var(--ink-2)' }}>
        {title}
      </div>
      <div className="t-small mt-2">{message}</div>
      {onRetry && (
        <div className="mt-3">
          <Button size="sm" icon="refresh" onClick={onRetry}>
            Повторить
          </Button>
        </div>
      )}
    </div>
  );
}
