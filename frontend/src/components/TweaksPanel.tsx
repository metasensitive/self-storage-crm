import { useEffect, useRef, useState } from 'react';
import { useTweaks, type Density, type Theme } from '@/hooks/useTweaks';
import { Ic } from './Ic';

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

const DENSITY_OPTIONS: Array<{ value: Density; label: string }> = [
  { value: 'compact', label: 'Компактная' },
  { value: 'comfortable', label: 'Комфортная' },
  { value: 'spacious', label: 'Просторная' },
];

export function TweaksPanel() {
  const { tweaks, setTweak } = useTweaks();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="tweaks-host">
      {open && (
        <div className="tweaks-card" role="dialog" aria-label="Настройки внешнего вида">
          <div className="tweaks-head">
            <span className="t-micro">Внешний вид</span>
            <button
              type="button"
              className="icon-btn"
              aria-label="Закрыть"
              onClick={() => setOpen(false)}
            >
              <Ic name="close" size={14} />
            </button>
          </div>

          <div className="tweaks-section">
            <span className="t-small muted">Тема</span>
            <div className="tweaks-segment">
              {THEME_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={'tweaks-seg-btn' + (tweaks.theme === o.value ? ' active' : '')}
                  onClick={() => setTweak('theme', o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks-section">
            <span className="t-small muted">Плотность</span>
            <div className="tweaks-segment">
              {DENSITY_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={
                    'tweaks-seg-btn' + (tweaks.density === o.value ? ' active' : '')
                  }
                  onClick={() => setTweak('density', o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="tweaks-foot t-small dim">
            Настройки сохраняются на этом устройстве.
          </div>
        </div>
      )}

      <button
        type="button"
        className="tweaks-trigger"
        aria-label={open ? 'Закрыть настройки' : 'Открыть настройки'}
        onClick={() => setOpen((v) => !v)}
      >
        <Ic name={open ? 'close' : 'settings'} size={16} />
      </button>
    </div>
  );
}
