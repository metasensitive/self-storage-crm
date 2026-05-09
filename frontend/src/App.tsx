import { useTweaks } from './hooks/useTweaks';

export default function App() {
  const { tweaks, setTweak } = useTweaks();

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--ink)' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '64px 32px' }}>
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="col">
            <div className="brand-name">Storehaus</div>
            <div className="brand-sub">Operations</div>
          </div>
        </div>

        <h1 className="h-display mt-6">
          Дизайн-токены и темы <em style={{ fontStyle: 'italic' }}>подключены.</em>
        </h1>
        <p className="muted mt-2 t-body">
          Каркас сборки, шрифты Instrument Serif + Plus Jakarta Sans + JetBrains Mono, светлая и
          тёмная темы, дизайн-токены из прототипа Claude Design — на месте. Дальше — API-клиент и
          UI-примитивы.
        </p>

        <div className="card mt-6">
          <div className="card-head">
            <div className="col">
              <span className="t-micro">Tweaks</span>
              <span className="h-2 mt-1">Внешний вид</span>
            </div>
          </div>
          <div className="card-body col gap-4">
            <div className="row gap-3">
              <span className="t-small" style={{ minWidth: 110 }}>
                Тема
              </span>
              <div className="row gap-2">
                {(['light', 'dark'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn sm${tweaks.theme === value ? ' btn-primary' : ''}`}
                    onClick={() => setTweak('theme', value)}
                  >
                    {value === 'light' ? 'Светлая' : 'Тёмная'}
                  </button>
                ))}
              </div>
            </div>

            <div className="row gap-3">
              <span className="t-small" style={{ minWidth: 110 }}>
                Плотность
              </span>
              <div className="row gap-2">
                {(['compact', 'comfortable', 'spacious'] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`btn sm${tweaks.density === value ? ' btn-primary' : ''}`}
                    onClick={() => setTweak('density', value)}
                  >
                    {value === 'compact'
                      ? 'Компактная'
                      : value === 'comfortable'
                        ? 'Комфортная'
                        : 'Просторная'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="row gap-2 mt-6">
          <span className="badge active">
            <span className="dot"></span>Активна
          </span>
          <span className="badge rented">
            <span className="dot"></span>Арендована
          </span>
          <span className="badge reserved">
            <span className="dot"></span>Резерв
          </span>
          <span className="badge blocked">
            <span className="dot"></span>Блок.
          </span>
          <span className="badge finished">
            <span className="dot"></span>Завершена
          </span>
        </div>

        <div className="t-small mt-8 mono">
          © 2026 Storehaus. Сборка <span className="tnum">0.1.0</span>.
        </div>
      </div>
    </div>
  );
}
