/**
 * Время для чата поддержки. Все рендеры — через нативный Intl.DateTimeFormat,
 * который использует **браузерный** часовой пояс пользователя. Backend отдаёт
 * timestamps в UTC (Carbon::toISOString() с Z-суффиксом); Intl разруливает
 * парсинг и приводит к local time у каждого пользователя индивидуально.
 *
 * Раньше dayjs тоже использовал local time, но в эджах (когда строка не
 * имела Z или в ISO был странный формат) мог фолбэкнуть на UTC. Intl-API
 * стандартен и предсказуем.
 */

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HM = new Intl.DateTimeFormat('ru-RU', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
const SHORT_WEEKDAY = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' });
const DM = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' });
const DMY = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});
const DMY_HM = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Часы:минуты в локальном TZ — для бабла сообщения и т. п. */
export function fmtTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? HM.format(d) : '';
}

/** Дата + время — для хедера тикета и подобного. */
export function fmtDateTimeLocal(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? DMY_HM.format(d) : '';
}

/**
 * Формат времени для строки в списке тикетов (telegram-style):
 *   сегодня → HH:mm
 *   вчера → «вчера»
 *   в пределах недели → короткий день недели (пн / вт / …)
 *   этот год → «17 мая»
 *   старше → «17 мая 2025»
 */
export function fmtTicketListTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return '';
  const now = new Date();

  if (isSameLocalDay(d, now)) return HM.format(d);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameLocalDay(d, yesterday)) return 'вчера';

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);
  if (d >= weekAgo) {
    return SHORT_WEEKDAY.format(d).replace('.', '').toLowerCase();
  }

  if (d.getFullYear() === now.getFullYear()) return DM.format(d);
  return DMY.format(d);
}
