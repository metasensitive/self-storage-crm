import { Link } from 'react-router-dom';

export default function NotFoundPage() {
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
      <div className="col gap-4" style={{ alignItems: 'center', textAlign: 'center' }}>
        <span className="t-micro">404</span>
        <h1 className="h-display">Страница не найдена</h1>
        <p className="muted t-body">Возможно, ссылка устарела или была изменена.</p>
        <Link to="/" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          На главную
        </Link>
      </div>
    </div>
  );
}
