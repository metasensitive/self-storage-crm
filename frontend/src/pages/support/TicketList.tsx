import { Avatar } from '@/components/ui/Avatar';
import { Ic } from '@/components/Ic';
import type { SupportTicket } from '@/api/support';
import { fmtTicketListTime } from './time';

interface TicketListProps {
  tickets: SupportTicket[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Показывать аватар менеджера в строке (для админа). */
  showManager: boolean;
  /** Нужен чтобы понять, чьё последнее сообщение — для check/check_double. */
  currentUserId: number;
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
        // Индикатор прочтения показываем только если последнее сообщение —
        // обычное (не системное) и принадлежит текущему пользователю.
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

            {/* Лево: тема + превью. Имя менеджера тут не показываем —
                и так есть аватар, а полное имя дублируется в хедере чата. */}
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div
                style={{
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
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  minHeight: 16,
                }}
              >
                {t.last_message_preview ?? ''}
              </div>
            </div>

            {/* Право: время сверху, бейдж непрочитанных под ним. Min-width
                держит колонку фиксированной — карточка не «скачет» от
                длины времени. */}
            <div
              style={{
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 6,
                minWidth: 56,
                paddingTop: 2,
              }}
            >
              <div
                className="t-small dim"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  whiteSpace: 'nowrap',
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
                      size={14}
                    />
                  </span>
                )}
                <span>{fmtTicketListTime(t.last_message_at ?? t.created_at)}</span>
              </div>
              {t.unread_count > 0 ? (
                <span
                  style={{
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 999,
                    background: 'var(--accent)',
                    color: 'var(--accent-fg)',
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: '20px',
                    textAlign: 'center',
                  }}
                >
                  {t.unread_count > 99 ? '99+' : t.unread_count}
                </span>
              ) : (
                // Невидимый placeholder той же высоты — карточки строго
                // одинаковой высоты, не дёргаются при чтении/появлении бейджа.
                <span style={{ height: 20 }} aria-hidden />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
