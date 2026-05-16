import { Ic } from '@/components/Ic';
import { fmtDateTime } from '@/lib/format';
import type { SupportMessage } from '@/api/support';
import type { Role } from '@/api/types';
import { authorDisplayName } from './utils';

interface SystemMessageProps {
  message: SupportMessage;
  viewerRole: Role | null;
}

/**
 * Системные сообщения о смене статуса тикета. Центрированная плашка,
 * без аватара, с временем и (если есть) именем инициатора. У менеджера
 * имена админов маскируются — он не должен видеть конкретных людей.
 */
export function SystemMessage({ message, viewerRole }: SystemMessageProps) {
  const actor = authorDisplayName(message.author, viewerRole) ?? 'Система';

  let label = '';
  if (message.type === 'system_closed') label = `${actor} закрыл тикет`;
  else if (message.type === 'system_reopened') label = `${actor} переоткрыл тикет`;
  else label = 'Системное событие';

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        justifyContent: 'center',
        margin: '6px 0',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: 'var(--bg-muted)',
          border: '1px solid var(--line)',
          borderRadius: 999,
          color: 'var(--ink-2)',
          fontSize: 12,
          maxWidth: '80%',
        }}
      >
        <Ic name={message.type === 'system_closed' ? 'lock' : 'reopen'} size={12} />
        <span>{label}</span>
        <span style={{ color: 'var(--ink-3)' }}>· {fmtDateTime(message.created_at)}</span>
      </div>
    </div>
  );
}
