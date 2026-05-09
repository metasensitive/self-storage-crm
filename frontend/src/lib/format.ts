import dayjs from 'dayjs';
import 'dayjs/locale/ru';

dayjs.locale('ru');

interface MoneyOptions {
  compact?: boolean;
  currency?: string;
}

export function fmtMoney(n: number | null | undefined, opts: MoneyOptions = {}): string {
  const { compact = false, currency = '₽' } = opts;
  if (n == null) return '—';
  if (compact && Math.abs(n) >= 1_000_000) {
    return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} млн ${currency}`;
  }
  if (compact && Math.abs(n) >= 1_000) {
    return `${Math.round(n / 100) / 10}k ${currency}`;
  }
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(n))} ${currency}`;
}

export function fmtDate(s: string | Date | null | undefined): string {
  if (!s) return '—';
  return dayjs(s).format('D MMM YYYY');
}

export function fmtDateShort(s: string | Date | null | undefined): string {
  if (!s) return '—';
  return dayjs(s).format('DD.MM.YYYY');
}

export function fmtDateTime(s: string | Date | null | undefined): string {
  if (!s) return '—';
  return dayjs(s).format('D MMM YYYY, HH:mm');
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join('')
    .toUpperCase();
}

export function daysBetween(from: string | Date, to: string | Date): number {
  return dayjs(to).diff(dayjs(from), 'day');
}

export function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const n1 = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (n1 > 1 && n1 < 5) return forms[1];
  if (n1 === 1) return forms[0];
  return forms[2];
}
