import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'var(--bg)',
        color: 'var(--ink)',
      }}
    >
      <div
        className="col gap-6"
        style={{ alignItems: 'center', textAlign: 'center', maxWidth: 720, padding: 32 }}
      >
        <div className="brand">
          <div className="brand-mark">S</div>
          <div className="col" style={{ alignItems: 'flex-start' }}>
            <div className="brand-name">Storehaus</div>
            <div className="brand-sub">Operations</div>
          </div>
        </div>
        <h1 className="h-display">
          Один интерфейс для сети контейнерных кладовок —{' '}
          <em style={{ fontStyle: 'italic' }}>от локации до отдельной ячейки.</em>
        </h1>
        <p className="muted t-body" style={{ maxWidth: 540 }}>
          Управляйте локациями, контейнерами, кладовками и арендами в одном инструменте. Лендинг с
          полным интерактивом будет в следующем этапе.
        </p>
        <Link to="/login" className="btn btn-primary lg" style={{ textDecoration: 'none' }}>
          Войти в систему
        </Link>
      </div>
    </div>
  );
}
