/**
 * Singleton Laravel Echo поверх Reverb.
 *
 * Лениво создаётся на первый вызов `getEcho()`. Передаём текущий Sanctum
 * bearer-токен в `auth.headers` — наш `/api/broadcasting/auth` принимает
 * только `auth:sanctum`. При смене токена (логин под другим аккаунтом)
 * нужно вызвать `resetEcho()` — следующий getEcho() создаст новый инстанс.
 *
 * Если в окружении нет `VITE_REVERB_APP_KEY` — `getEcho()` возвращает null,
 * страницы должны изящно деградировать к polling/refetch.
 */
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getToken } from '@/api/client';

declare global {
  interface Window {
    Pusher?: typeof Pusher;
  }
}

let instance: Echo<'reverb'> | null = null;

function reverbConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_REVERB_APP_KEY &&
      import.meta.env.VITE_REVERB_HOST &&
      import.meta.env.VITE_REVERB_PORT,
  );
}

export function getEcho(): Echo<'reverb'> | null {
  if (!reverbConfigured()) return null;
  if (instance) return instance;

  // Pusher.js должен быть глобально — Echo берёт его из window.
  if (typeof window !== 'undefined') window.Pusher = Pusher;

  const scheme = import.meta.env.VITE_REVERB_SCHEME || 'http';
  const port = Number(import.meta.env.VITE_REVERB_PORT) || 8080;

  // API-эндпоинт авторизации приватных каналов под Sanctum (см. backend
  // bootstrap/app.php → withBroadcasting). Тот же baseURL, что у axios.
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const authEndpoint = `${apiBase}/api/broadcasting/auth`;

  const token = getToken();

  instance = new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY,
    wsHost: import.meta.env.VITE_REVERB_HOST,
    wsPort: port,
    wssPort: port,
    forceTLS: scheme === 'https',
    enabledTransports: ['ws', 'wss'],
    authEndpoint,
    auth: {
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  });

  return instance;
}

/** Сбрасывает singleton — нужно при смене аккаунта/токена. */
export function resetEcho(): void {
  if (instance) {
    try {
      instance.disconnect();
    } catch {
      /* noop */
    }
  }
  instance = null;
}
