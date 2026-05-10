import { Link, Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="auth-shell">
      <div className="auth-left">
        <Link
          to="/"
          className="brand"
          style={{ textDecoration: 'none', color: 'inherit', alignSelf: 'flex-start' }}
          aria-label="На главную"
        >
          <div className="brand-mark">S</div>
          <div className="col">
            <div className="brand-name">Storehaus</div>
            <div className="brand-sub">Operations</div>
          </div>
        </Link>
        <div className="auth-form">
          <Outlet />
        </div>
        <div className="t-small mt-6">© 2026 Storehaus. Все права защищены.</div>
      </div>
      <div className="auth-right">
        <div
          style={{
            maxWidth: 520,
            color: 'var(--ink-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 36,
          }}
        >
          <div className="row gap-3">
            <span style={{ width: 36, height: 1, background: 'var(--ink-3)' }} />
            <span className="t-micro" style={{ color: 'var(--ink-2)' }}>
              Сеть кладовок
            </span>
          </div>
          <h2
            className="serif"
            style={{
              fontSize: 54,
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: 'var(--ink)',
              fontWeight: 400,
              margin: 0,
            }}
          >
            Один интерфейс
            <br />
            для всей сети — <em style={{ fontStyle: 'italic' }}>от&nbsp;локации</em>
            <br />
            до отдельной ячейки.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 32px' }}>
            {[
              ['Локации', 'Объекты на карте города'],
              ['Контейнеры', 'Установка и обслуживание'],
              ['Кладовки', 'Размер, цена, доступность'],
              ['Аренды', 'Бронь → активная → завершение'],
            ].map(([t, d]) => (
              <div
                key={t}
                className="col gap-2"
                style={{ paddingTop: 14, borderTop: '1px solid var(--line)' }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 22,
                    color: 'var(--ink)',
                    lineHeight: 1.1,
                    letterSpacing: '-0.015em',
                  }}
                >
                  {t}
                </span>
                <span style={{ fontSize: 13.5, color: 'var(--ink-3)', lineHeight: 1.45 }}>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
