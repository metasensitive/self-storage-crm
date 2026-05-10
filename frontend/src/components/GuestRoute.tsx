import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from './ui/LoadingState';

export function GuestRoute() {
  const { user, status } = useAuth();
  const location = useLocation();
  const state = location.state as { addAccount?: boolean } | null;

  if (status !== 'ready') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingState label="Загрузка…" />
      </div>
    );
  }

  // Залогиненному пускаем на /login только если он пришёл «добавить аккаунт»
  if (user && !state?.addAccount) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
