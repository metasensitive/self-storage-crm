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
              flexDirection: 'column',
              gap: 4,
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {showManager && (
                <Avatar
                  name={t.manager?.name}
                  src={t.manager?.avatar_url}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="t-body"
                  style={{
                    fontWeight: t.unread_count > 0 ? 600 : 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {t.is_closed && (
                    <Ic name="lock" size={12} className="" />
                  )}
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {t.subject}
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
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 4,
                  flexShrink: 0,
                  // Фиксированная ширина колонки времени — иначе при сменах
                  // «только что → 2 мин → 6 ч → 2 дн» правый край съезжает
                  // и тема скачет по ширине. min-width делает выравнивание
                  // вертикально-ровным.
                  minWidth: 52,
                  textAlign: 'right',
                }}
              >
                <span className="t-small dim" style={{ whiteSpace: 'nowrap' }}>
                  {relTime(t.last_message_at ?? t.created_at)}
                </span>
                {t.unread_count > 0 && (
                  <span
                    style={{
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
            {t.last_message_preview && (
              <div
                className="t-small dim"
                style={{
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  paddingLeft: showManager ? 40 : 0,
                }}
              >
                {t.last_message_preview}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
