import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Ic } from '../Ic';
import { searchAddress, type AddressSuggestion } from '@/lib/geocoding';
import { Input } from './Input';
import { IconButton } from './Button';

export type { AddressSuggestion } from '@/lib/geocoding';

interface AddressAutocompleteProps {
  /** Выбранное значение. Если null — показываем поле ввода. */
  value: AddressSuggestion | null;
  onChange: (suggestion: AddressSuggestion | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Ограничение по странам (ISO-коды), например ['ru']. */
  countryCodes?: string[];
}

const DEBOUNCE_MS = 320;

export function AddressAutocomplete({
  value,
  onChange,
  placeholder = 'Введите адрес — например, Москва, Тверская 1',
  autoFocus,
  countryCodes,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Закрытие по клику вне
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [open]);

  // Debounced поиск
  useEffect(() => {
    if (value) return; // когда есть выбранное значение — не ищем
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    abortRef.current?.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    const t = window.setTimeout(async () => {
      try {
        const result = await searchAddress(trimmed, {
          signal: ctl.signal,
          countryCodes,
        });
        if (!ctl.signal.aborted) {
          setSuggestions(result);
          setOpen(true);
          setActiveIdx(result.length > 0 ? 0 : -1);
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Не удалось выполнить поиск адресов');
        setSuggestions([]);
      } finally {
        if (!ctl.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(t);
      ctl.abort();
    };
  }, [query, value, countryCodes]);

  function pick(s: AddressSuggestion) {
    onChange(s);
    setOpen(false);
    setQuery('');
  }

  function clear() {
    onChange(null);
    setQuery('');
    setSuggestions([]);
    setActiveIdx(-1);
    // Возвращаем фокус в инпут после очистки
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      if (activeIdx >= 0) {
        e.preventDefault();
        pick(suggestions[activeIdx]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  // Если уже что-то выбрано — показываем «чип» с возможностью изменить
  if (value) {
    return (
      <div
        style={{
          padding: '12px 14px',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          background: 'var(--bg-elev)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-micro" style={{ marginBottom: 4 }}>
            Выбран адрес
          </div>
          <div className="t-body" style={{ fontWeight: 500 }}>
            {value.address}
          </div>
          <div className="t-small dim mt-1">{value.displayName}</div>
          <div
            className="t-small mono mt-1"
            style={{ color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}
          >
            {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
          </div>
        </div>
        <IconButton icon="close" label="Изменить адрес" onClick={clear} />
      </div>
    );
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Input
          ref={inputRef}
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          style={{ paddingRight: 38 }}
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            color: loading ? 'var(--ink)' : 'var(--ink-3)',
            display: 'inline-flex',
          }}
        >
          <Ic name={loading ? 'refresh' : 'search'} size={16} />
        </span>
      </div>

      {open && (suggestions.length > 0 || error || query.length >= 3) && (
        <div
          role="listbox"
          style={dropdownStyle}
        >
          {error ? (
            <div className="t-small" style={{ padding: '12px 14px', color: 'var(--st-blocked)' }}>
              {error}
            </div>
          ) : suggestions.length === 0 && !loading ? (
            <div className="t-small dim" style={{ padding: '12px 14px' }}>
              Ничего не найдено. Попробуйте другой запрос.
            </div>
          ) : (
            suggestions.map((s, i) => (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className="suggest-item"
                onMouseEnter={() => setActiveIdx(i)}
                // mousedown срабатывает до blur input'а и до закрытия по mousedown-listener'у,
                // preventDefault не даёт инпуту потерять фокус — выбор гарантированно завершится.
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(s);
                }}
                data-active={i === activeIdx ? 'true' : 'false'}
              >
                <div className="t-body" style={{ fontWeight: 500 }}>
                  {s.address}
                </div>
                <div
                  className="t-small dim"
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.displayName}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const dropdownStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 4px)',
  left: 0,
  right: 0,
  background: 'var(--bg-elev)',
  border: '1px solid var(--line)',
  borderRadius: 'var(--r-md)',
  boxShadow: 'var(--shadow-3)',
  zIndex: 30,
  maxHeight: 320,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  padding: 4,
};
