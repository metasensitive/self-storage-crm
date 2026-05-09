import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingState } from './ui/LoadingState';

export function GuestRoute() {
  const { user, status } = useAuth();

  if (status !== 'ready') {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <LoadingState label="Загрузка…" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
