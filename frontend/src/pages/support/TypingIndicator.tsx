import type { Role } from '@/api/types';

export interface TypingUser {
  id: number;
  name: string;
  role: 'admin' | 'manager';
  lastSeen: number;
}

interface TypingIndicatorProps {
  users: Map<number, TypingUser>;
  /** Роль текущего пользователя — для маскировки имени админа у менеджера. */
  viewerRole: Role | null;
}

/**
 * Полоса «X набирает…» между лентой сообщений и композером.
 *
 * Логика имени:
 *  - Если в наборе хотя бы один админ и viewer — менеджер: показываем
 *    обобщённое «Администратор набирает…» (та же маскировка, что в чате).
 *  - Если набирающих 2+ и они разные люди: «Несколько человек печатают…».
 *  - Иначе «{имя} печатает…».
 *
 * Скрыта когда users пуст — занимает 0 высоты, не сдвигает композер.
 */
export function TypingIndicator({ users, viewerRole }: TypingIndicatorProps) {
  if (users.size === 0) return null;

  const items = Array.from(users.values());

  let label: string;
  if (viewerRole === 'manager' && items.some((u) => u.role === 'admin')) {
    label = 'Администратор печатает…';
  } else if (items.length === 1) {
    label = `${items[0].name} печатает…`;
  } else if (items.length === 2) {
    label = `${items[0].name} и ${items[1].name} печатают…`;
  } else {
    label = 'Несколько человек печатают…';
  }

  return (
    <div
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px 6px',
        color: 'var(--ink-3)',
        fontSize: 12,
        background: 'var(--bg)',
        borderTop: '1px solid transparent',
        minHeight: 22,
      }}
    >
      <Dots />
      <span>{label}</span>
    </div>
  );
}

/**
 * Три точечка-волна, как в Telegram. Чистый CSS через @keyframes —
 * без зависимостей, без re-render'ов.
 */
function Dots() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        height: 10,
      }}
    >
      <i style={dotStyle(0)} />
      <i style={dotStyle(160)} />
      <i style={dotStyle(320)} />
      <style>{KEYFRAMES}</style>
    </span>
  );
}

function dotStyle(delayMs: number): React.CSSProperties {
  return {
    width: 5,
    height: 5,
    borderRadius: 999,
    background: 'currentColor',
    display: 'inline-block',
    animation: 'support-typing-wave 1.2s ease-in-out infinite',
    animationDelay: `${delayMs}ms`,
  };
}

const KEYFRAMES = `
@keyframes support-typing-wave {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
  30% { transform: translateY(-3px); opacity: 1; }
}
`;
