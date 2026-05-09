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
import { Ic, type IconName } from '../Ic';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  text: string;
}

interface ToastContextValue {
  show: (text: string, tone?: ToastTone) => void;
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Глобальный мост — позволяет показывать toast из мест вне React-дерева
// (например, из обработчиков ошибок QueryClient).
let globalToast: ToastContextValue | null = null;

export function getGlobalToast(): ToastContextValue | null {
  return globalToast;
}

const TONE_STYLE: Record<ToastTone, { bg: string; bd: string; fg: string; icon: IconName }> = {
  success: {
    bg: 'oklch(0.96 0.04 150)',
    bd: 'oklch(0.86 0.05 150)',
    fg: 'oklch(0.32 0.10 150)',
    icon: 'check',
  },
  error: {
    bg: 'oklch(0.96 0.03 25)',
    bd: 'oklch(0.86 0.05 25)',
    fg: 'oklch(0.36 0.10 25)',
    icon: 'info',
  },
  info: {
    bg: 'var(--bg-elev)',
    bd: 'var(--line)',
    fg: 'var(--ink)',
    icon: 'info',
  },
};

const DURATION = 4500;

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (text: string, tone: ToastTone = 'info') => {
      idRef.current += 1;
      const id = idRef.current;
      setToasts((prev) => [...prev, { id, tone, text }]);
      window.setTimeout(() => dismiss(id), DURATION);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (t: string) => show(t, 'success'),
      error: (t: string) => show(t, 'error'),
      info: (t: string) => show(t, 'info'),
    }),
    [show],
  );

  useEffect(() => {
    globalToast = value;
    return () => {
      if (globalToast === value) globalToast = null;
    };
  }, [value]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          zIndex: 100,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          const s = TONE_STYLE[t.tone];
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              style={{
                background: s.bg,
                border: `1px solid ${s.bd}`,
                color: s.fg,
                padding: '10px 14px',
                borderRadius: 'var(--r-md)',
                boxShadow: 'var(--shadow-2)',
                fontSize: 13.5,
                lineHeight: 1.4,
                maxWidth: 380,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                pointerEvents: 'auto',
                cursor: 'pointer',
                animation: 'slide-in .22s cubic-bezier(.2, .9, .25, 1)',
              }}
            >
              <Ic name={s.icon} size={16} className="" />
              <span style={{ flex: 1 }}>{t.text}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// Возвращает удобный helper для извлечения сообщения из ApiError или any-ошибки
export function useToastError() {
  const { error } = useToast();
  return useCallback(
    (err: unknown, fallback = 'Что-то пошло не так') => {
      const message =
        err && typeof err === 'object' && 'body' in err && err.body && typeof err.body === 'object'
          ? (err.body as { message?: string }).message
          : err instanceof Error
            ? err.message
            : null;
      error(message || fallback);
    },
    [error],
  );
}

