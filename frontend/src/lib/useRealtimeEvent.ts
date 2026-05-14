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
    const handler = (payload: T) => cbRef.current(payload);
    // listen() с точкой в начале = слушать событие с кастомным именем
    // (которое мы задали через broadcastAs()) — без префикса класса PHP.
    const ch = echo.private(opts.channel);
    ch.listen(`.${opts.event}`, handler as (e: unknown) => void);
    return () => {
      ch.stopListening(`.${opts.event}`, handler as (e: unknown) => void);
    };
  }, [opts.channel, opts.event, opts.enabled]);
}
