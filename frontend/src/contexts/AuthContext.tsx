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
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/api/auth';
import { profileApi } from '@/api/profile';
import { getToken, registerUnauthorizedHandler, setToken } from '@/api/client';
import { accountsStore, type StoredAccount } from '@/lib/accounts';
import { resetEcho } from '@/lib/echo';
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

  // ===== Мульти-аккаунты =====
  /** Сохранённые на этом устройстве аккаунты с их токенами */
  accounts: StoredAccount[];
  /** Переключиться на другой сохранённый аккаунт по id */
  switchAccount: (id: number) => Promise<void>;
  /** Удалить аккаунт из списка (без logout на бэке, просто локальная очистка) */
  removeAccount: (id: number) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Эвристика: если updated_at идентичен created_at (или отличается на считанные
 * миллисекунды от того же save) — пользователь только что создан и не менял пароль.
 *
 * Допуск 200 мс ловит микросекундные расхождения в БД/сериализации, но не
 * настоящие интервалы — после первой же смены пароля разница станет ≥ секунд,
 * и эвристика вернёт false (юзер активен).
 */
export function detectMustChangePassword(u: User | null): boolean {
  if (!u || !u.created_at || !u.updated_at) return false;
  if (u.created_at === u.updated_at) return true;
  const created = Date.parse(u.created_at);
  const updated = Date.parse(u.updated_at);
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return Math.abs(updated - created) < 200;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [accounts, setAccounts] = useState<StoredAccount[]>(() => accountsStore.list());
  const cancelledRef = useRef(false);

  function applyUser(u: User | null) {
    setUser(u);
    setMustChangePassword(detectMustChangePassword(u));
  }

  function rememberAccount(u: User, token: string) {
    const next = accountsStore.upsert({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar_url: u.avatar_url,
      token,
    });
    setAccounts(next);
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
      resetEcho();
      queryClient.clear();
      applyUser(null);
    });
    return () => registerUnauthorizedHandler(null);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
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
      // Новый юзер — кэш предыдущего невалиден (актуально если в этой
      // вкладке кто-то был залогинен).
      queryClient.clear();
      applyUser(full);
      rememberAccount(full, token);
      setStatus('ready');
      return full;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const currentId = user?.id;
    try {
      await authApi.logout();
    } catch {
      // даже если сервер вернул ошибку — локально чистим состояние
    }
    setToken(null);
    resetEcho();
    queryClient.clear();
    applyUser(null);
    if (currentId != null) {
      const next = accountsStore.remove(currentId);
      setAccounts(next);
    }
  }, [user]);

  const switchAccount = useCallback(
    async (id: number) => {
      const acc = accountsStore.find(id);
      if (!acc) return;
      setToken(acc.token);
      resetEcho(); // следующий getEcho() поднимется уже под новый токен
      // Сразу выбрасываем кэш предыдущего юзера: его уведомления, сессии,
      // профиль — всё в кэше react-query относится к старому аккаунту и
      // не должно «протечь» в новый. Без этого после свитча компоненты
      // продолжают показывать данные предыдущего юзера до ручного refresh.
      queryClient.clear();
      setStatus('loading');
      try {
        const me = await profileApi.show();
        applyUser(me);
        // Обновим запись в localStorage свежими полями (имя/аватар могли измениться)
        rememberAccount(me, acc.token);
      } catch {
        // Токен мёртв на сервере — удаляем аккаунт локально
        accountsStore.remove(id);
        setAccounts(accountsStore.list());
        setToken(null);
        applyUser(null);
      } finally {
        setStatus('ready');
      }
    },
    [queryClient],
  );

  const removeAccount = useCallback(
    (id: number) => {
      const next = accountsStore.remove(id);
      setAccounts(next);
      // Если удалили текущий — выходим
      if (user?.id === id) {
        setToken(null);
        applyUser(null);
      }
    },
    [user],
  );

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
      accounts,
      switchAccount,
      removeAccount,
    }),
    [
      user,
      status,
      mustChangePassword,
      login,
      logout,
      refresh,
      markPasswordChanged,
      accounts,
      switchAccount,
      removeAccount,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
