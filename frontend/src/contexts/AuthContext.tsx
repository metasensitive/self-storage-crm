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
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const cancelledRef = useRef(false);

  const refresh = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStatus('ready');
      return;
    }
    setStatus('loading');
    try {
      const me = await profileApi.show();
      if (!cancelledRef.current) setUser(me);
    } catch {
      setToken(null);
      if (!cancelledRef.current) setUser(null);
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
      setUser(null);
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
    setUser(full);
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
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      role: user?.role ?? null,
      status,
      login,
      logout,
      refresh,
      setUser,
    }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
