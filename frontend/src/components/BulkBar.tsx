import { type ReactNode } from 'react';
import { Button } from './ui/Button';
import { pluralize } from '@/lib/format';

/** Чекбокс с тремя состояниями: пусто / частично (indeterminate) / все. */
export function CheckboxTri({
  state,
  onChange,
  ariaLabel,
}: {
  state: 'all' | 'none' | 'some';
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <input
      type="checkbox"
      checked={state === 'all'}
      ref={(el) => {
        if (el) el.indeterminate = state === 'some';
      }}
      onChange={onChange}
      aria-label={ariaLabel}
    />
  );
}

interface BulkBarProps {
  count: number;
  /** Существительное в трёх формах для счётчика: «1 элемент / 2 элемента / 5 элементов». */
  noun: [string, string, string];
  /** Кнопки действий — рендерим как переданы. */
  actions: ReactNode;
  onClear: () => void;
}

/**
 * Плавающая полоса массовых действий. Показывается, когда `count > 0`.
 * Рендерится над таблицей и подменяет смысловой контекст: пока что-то
 * выбрано, оператор работает не со списком, а с подмножеством.
 */
export function BulkBar({ count, noun, actions, onClear }: BulkBarProps) {
  if (count === 0) return null;
  const word = pluralize(count, noun);
  return (
    <div
      className="row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        marginBottom: 12,
        background: 'var(--bg-elev)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        flexWrap: 'wrap',
      }}
      role="toolbar"
      aria-label="Массовые действия"
    >
      <span className="t-body" style={{ fontWeight: 500 }}>
        Выбрано: {count} {word}
      </span>
      <div style={{ marginLeft: 'auto' }} />
      <div className="row" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {actions}
        <Button size="sm" variant="ghost" icon="close" onClick={onClear}>
          Очистить
        </Button>
      </div>
    </div>
  );
}
