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
  /** Нужен чтобы понять, чьё последнее сообщение — для check/check_double. */
  currentUserId: number;
}

/**
 * Telegram-style формат времени последнего сообщения в карточке тикета:
 * - сегодня → «14:32»
 * - вчера → «вчера»
 * - в пределах недели → короткое название дня недели на русском (пн, вт, …)
 * - в этом году → «17 мая»
 * - старше → «17 мая 2025»
 *
 * Раньше тут было relTime («6 ч» и т. п.) — короче, но менее очевидно для
 * пользователя, особенно когда сообщение было «4 часа назад в 02:00» —
 * абсолютное время понятнее.
 */
function lastMessageTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = dayjs(iso);
  if (!d.isValid()) return '';
  const now = dayjs();
  const dayDiff = now.startOf('day').diff(d.startOf('day'), 'day');
  if (dayDiff === 0) return d.format('HH:mm');
  if (dayDiff === 1) return 'вчера';
  if (dayDiff < 7) return d.format('dd');
  if (d.year() === now.year()) return d.format('D MMM');
  return d.format('D MMM YYYY');
}

export function TicketList({
  tickets,
  selectedId,
  onSelect,
  showManager,
  currentUserId,
}: TicketListProps) {
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
        // Индикатор прочтения показываем только если последнее сообщение в
        // тикете — обычное (не системное) и принадлежит текущему пользователю.
        // Чужое последнее сообщение → индикатор скрыт (как в Telegram).
        const lm = t.last_message;
        const showReceipt =
          lm && lm.type === 'message' && lm.author_id === currentUserId;
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
                <div
                  className="t-small dim"
                  style={{
                    flexShrink: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  {showReceipt && (
                    <span
                      title={lm.read_by_others ? 'Прочитано' : 'Доставлено'}
                      style={{
                        display: 'inline-flex',
                        color: lm.read_by_others ? 'var(--accent)' : 'var(--ink-3)',
                      }}
                    >
                      <Ic
                        name={lm.read_by_others ? 'check_double' : 'check'}
                        size={12}
                      />
                    </span>
                  )}
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {lastMessageTime(t.last_message_at ?? t.created_at)}
                  </span>
                </div>
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
