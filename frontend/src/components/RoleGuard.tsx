import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import type { Role } from '@/api/types';

interface RoleGuardProps {
  allow: Role[];
}

export function RoleGuard({ allow }: RoleGuardProps) {
  const { role } = useAuth();
  if (role && allow.includes(role)) return <Outlet />;
  return <Navigate to="/dashboard" replace />;
}
