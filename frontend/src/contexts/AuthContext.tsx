/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '@/api/auth';
import { profileApi } from '@/api/profile';
import { getToken, registerUnauthorizedHandler, setToken } from '@/api/client';
import type { Role, User } from '@/api/types';

interface AuthContextValue {
  user: User | null;
  role: Role | null;
  status: 'idle' | 'loading' | 'ready';
  /**
   * true — пользователь только что зарегистрирован и ещё не менял пароль.
   * Используется как клиентский gate: ProtectedRoute редиректит таких на /first-login.
   */
  mustChangePassword: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
  /** Пометить пользователя как сменившего пароль (вызывает FirstLoginPage после смены) */
  markPasswordChanged: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Эвристика: если updated_at равен created_at (с допуском 2 секунды) — пользователь
 * никогда не входил в систему / не менял пароль.
 * После любой смены (через смену пароля или /profile update) Laravel обновляет updated_at,
 * и юзер становится «активным».
 */
function detectMustChangePassword(u: User | null): boolean {
  if (!u || !u.created_at || !u.updated_at) return false;
  const created = new Date(u.created_at).getTime();
  const updated = new Date(u.updated_at).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return Math.abs(updated - created) < 2000;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const cancelledRef = useRef(false);

  function applyUser(u: User | null) {
    setUser(u);
    setMustChangePassword(detectMustChangePassword(u));
  }

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      applyUser(null);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    try {
      const me = await profileApi.show();
      if (!cancelledRef.current) applyUser(me);
    } catch {
      setToken(null);
      if (!cancelledRef.current) applyUser(null);
    } finally {
      if (!cancelledRef.current) setStatus('ready');
    }
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    void refresh();
    return () => {
      cancelledRef.current = true;
    };
  }, [refresh]);

  // Подключаем глобальный обработчик 401: чистим состояние, редирект делает страница
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      applyUser(null);
    });
    return () => registerUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: authUser, token } = await authApi.login({ email, password });
    setToken(token);
    // Догружаем полный профиль (с created_at и т.д.)
    const full = await profileApi.show().catch(
      () =>
        ({
          ...authUser,
          created_at: '',
          updated_at: '',
        }) as User,
    );
    applyUser(full);
    setStatus('ready');
    return full;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // даже если сервер вернул ошибку — локально чистим состояние
    }
    setToken(null);
    applyUser(null);
  }, []);

  const markPasswordChanged = useCallback(() => {
    setMustChangePassword(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      mustChangePassword,
      login,
      logout,
      refresh,
      setUser,
      markPasswordChanged,
    }),
    [user, status, mustChangePassword, login, logout, refresh, markPasswordChanged],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
