import { useEffect, useRef } from 'react';
import { getEcho } from './echo';

interface Options<T = unknown> {
  /** Имя приватного канала без префикса `private-` (Echo добавляет сам). */
  channel: string;
  /** Имя события, как в `broadcastAs()` на бэке. */
  event: string;
  /** Колбэк на каждое полученное сообщение. */
  onEvent: (payload: T) => void;
  /** Не подключаться, если false. */
  enabled?: boolean;
}

/**
 * Подписка React-компонента на private-канал Reverb через Echo.
 *
 * Если Echo не сконфигурирован (нет `VITE_REVERB_APP_KEY`) — хук молча
 * ничего не делает, страницы продолжают работать на refetch/polling.
 */
export function useRealtimeEvent<T = unknown>(opts: Options<T>): void {
  // Колбэк через ref — чтобы не пересоздавать подписку на каждом рендере.
  const cbRef = useRef(opts.onEvent);
  cbRef.current = opts.onEvent;

  useEffect(() => {
    if (opts.enabled === false) return;
    const echo = getEcho();
    if (!echo) return;
    const handler = (payload: T) => {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.info(`[echo] event ${opts.event} on ${opts.channel}:`, payload);
      }
      cbRef.current(payload);
    };
    // listen() с точкой в начале = слушать событие с кастомным именем
    // (которое мы задали через broadcastAs()) — без префикса класса PHP.
    const ch = echo.private(opts.channel);
    ch.listen(`.${opts.event}`, handler as (e: unknown) => void);
    // Логи подписки + auth-ошибок в dev.
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.info(`[echo] subscribing to ${opts.channel} for .${opts.event}`);
      // pusher выкидывает 'pusher:subscription_succeeded' / 'pusher:subscription_error'
      ch.error((err: unknown) => {
        // eslint-disable-next-line no-console
        console.error(`[echo] subscription error on ${opts.channel}:`, err);
      });
    }
    return () => {
      ch.stopListening(`.${opts.event}`, handler as (e: unknown) => void);
    };
  }, [opts.channel, opts.event, opts.enabled]);
}
