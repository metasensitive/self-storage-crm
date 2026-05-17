import dayjs from 'dayjs';
import { Avatar } from '@/components/ui/Avatar';
import { Ic } from '@/components/Ic';
import type { SupportTicket } from '@/api/support';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Показывать имя менеджера в строке (для админа). */
  showManager: boolean;
}

function relTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - dayjs(iso).valueOf();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} дн`;
  return dayjs(iso).format('D MMM');
}

export function TicketList({ tickets, selectedId, onSelect, showManager }: TicketListProps) {
  if (tickets.length === 0) {
    return (
      <div
        className="t-small dim"
        style={{
          padding: '40px 16px',
          textAlign: 'center',
        }}
      >
        Нет тикетов
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {tickets.map((t) => {
        const active = t.id === selectedId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '12px 14px',
              textAlign: 'left',
              background: active ? 'var(--bg-muted)' : 'transparent',
              borderLeft: active ? '3px solid var(--accent)' : '3px solid transparent',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: '1px solid var(--line)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            {showManager && (
              <div style={{ flexShrink: 0, paddingTop: 2 }}>
                <Avatar name={t.manager?.name} src={t.manager?.avatar_url} />
              </div>
            )}

            {/* Telegram-style row: тема + время на одной baseline-строке,
                ниже превью + badge — без зарезервированной правой колонки,
                время естественно прижато к правому краю карточки. */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    overflow: 'hidden',
                  }}
                >
                  {t.is_closed && (
                    <span style={{ flexShrink: 0, color: 'var(--ink-3)', display: 'flex' }}>
                      <Ic name="lock" size={12} />
                    </span>
                  )}
                  <span
                    className="t-body"
                    style={{
                      fontWeight: t.unread_count > 0 ? 600 : 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      minWidth: 0,
                    }}
                  >
                    {t.subject}
                  </span>
                </div>
                <span
                  className="t-small dim"
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {relTime(t.last_message_at ?? t.created_at)}
                </span>
              </div>

              {showManager && t.manager?.name && (
                <div
                  className="t-small dim"
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t.manager.name}
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: 8,
                  minHeight: 16,
                }}
              >
                <span
                  className="t-small dim"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {t.last_message_preview ?? ''}
                </span>
                {t.unread_count > 0 && (
                  <span
                    style={{
                      flexShrink: 0,
                      minWidth: 18,
                      height: 18,
                      padding: '0 6px',
                      borderRadius: 999,
                      background: 'var(--accent)',
                      color: 'var(--accent-fg)',
                      fontSize: 10,
                      fontWeight: 700,
                      lineHeight: '18px',
                      textAlign: 'center',
                    }}
                  >
                    {t.unread_count > 9 ? '9+' : t.unread_count}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
