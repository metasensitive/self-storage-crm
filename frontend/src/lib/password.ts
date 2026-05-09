const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // без l/o
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // без I/O
const DIGITS = '23456789'; // без 0/1
const SYMBOLS = '@#$%&*?!';

function pickRandom(pool: string): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return pool[arr[0] % pool.length];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 0xffffffff) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Генерирует читаемый временный пароль фиксированной длины 12.
 * Гарантирует наличие минимум одной строчной/заглавной/цифры/спецсимвола.
 * Исключает похожие глифы (0/O, 1/l/I) для уменьшения ошибок при ручном вводе.
 */
export function generateTempPassword(length = 12): string {
  const required = [
    pickRandom(LOWER),
    pickRandom(UPPER),
    pickRandom(DIGITS),
    pickRandom(SYMBOLS),
  ];
  const all = LOWER + UPPER + DIGITS + SYMBOLS;
  const rest = Array.from({ length: Math.max(0, length - required.length) }, () => pickRandom(all));
  return shuffle([...required, ...rest]).join('');
}

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

export interface PasswordStrength {
  /** Числовой score 0..6 — сколько критериев выполнено */
  score: number;
  /** Доля 0..1 для прогресс-бара */
  ratio: number;
  /** Текстовый ярлык */
  label: 'Слабый' | 'Средний' | 'Хороший' | 'Отличный';
  /** Цвет в oklch (для шкалы и подписи) */
  color: string;
  /** Проверки для UI */
  checks: PasswordCheck[];
}

const RANGES: Array<{
  min: number;
  label: PasswordStrength['label'];
  color: string;
}> = [
  { min: 0, label: 'Слабый', color: 'oklch(0.58 0.10 25)' },
  { min: 3, label: 'Средний', color: 'oklch(0.62 0.10 80)' },
  { min: 5, label: 'Хороший', color: 'oklch(0.55 0.10 250)' },
  { min: 6, label: 'Отличный', color: 'oklch(0.55 0.10 150)' },
];

export function getPasswordStrength(password: string): PasswordStrength {
  const checks: PasswordCheck[] = [
    { label: 'Минимум 8 символов', ok: password.length >= 8 },
    { label: '12 символов или больше', ok: password.length >= 12 },
    { label: 'Строчная буква', ok: /[a-zа-я]/.test(password) },
    { label: 'Заглавная буква', ok: /[A-ZА-Я]/.test(password) },
    { label: 'Цифра', ok: /\d/.test(password) },
    { label: 'Спецсимвол', ok: /[^A-Za-zА-Яа-я0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const range = [...RANGES].reverse().find((r) => score >= r.min) ?? RANGES[0];
  return {
    score,
    ratio: Math.min(1, score / 6),
    label: range.label,
    color: range.color,
    checks,
  };
}

/**
 * Копирует строку в буфер обмена. Возвращает Promise<boolean> успеха.
 * Имеет фоллбек через скрытый textarea для старых браузеров.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
