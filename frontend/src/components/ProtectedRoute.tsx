import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from './ui/LoadingState';

export function ProtectedRoute() {
  const { user, status, mustChangePassword } = useAuth();
  const location = useLocation();

  if (status !== 'ready') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingState label="Загрузка профиля…" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Клиентский gate: если временный пароль ещё не сменён — пускаем
  // только на /first-login. Это UX-механика; серьёзная защита требует флаг на бэке.
  if (mustChangePassword && location.pathname !== '/first-login') {
    return <Navigate to="/first-login" replace />;
  }

  return <Outlet />;
}
