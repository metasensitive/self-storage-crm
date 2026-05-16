import { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Ic } from '@/components/Ic';
import { supportApi, type SupportTicket } from '@/api/support';
import { getToken } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import { useSupportTicketChannel } from '@/hooks/useSupportTicketChannel';
import { MessageBubble } from './MessageBubble';
import { Composer } from './Composer';

interface TicketViewProps {
  ticket: SupportTicket;
  currentUserId: number;
  /** Текущий пользователь — админ; владелец-менеджер тоже может закрыть свой тикет. */
  canChangeStatus: boolean;
}

export function TicketView({ ticket, currentUserId, canChangeStatus }: TicketViewProps) {
  const qc = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time подписка на канал тикета — новые сообщения и правки.
  useSupportTicketChannel(ticket.id);

  const messagesQ = useQuery({
    queryKey: queryKeys.support.messages(ticket.id, currentUserId),
    queryFn: () => supportApi.messages.list(ticket.id),
    staleTime: 5_000,
  });

  // Mark-read при открытии тикета + при каждом обновлении списка сообщений
  // (если есть непрочитанные сообщения не свои). Идемпотентно на бэке —
  // повторный вызов вернёт marked: 0.
  const markReadMut = useMutation({
    mutationFn: () => supportApi.tickets.markRead(ticket.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  const messages = messagesQ.data?.data ?? [];
  const hasUnreadForMe = useMemo(
    () =>
      messages.some(
        (m) =>
          !m.is_deleted &&
          m.author?.id !== currentUserId &&
          !m.read_by.some((r) => r.user_id === currentUserId),
      ),
    [messages, currentUserId],
  );

  useEffect(() => {
    if (hasUnreadForMe && !markReadMut.isPending) markReadMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreadForMe]);

  // Авто-скролл к низу при появлении новых сообщений (если пользователь
  // уже был внизу — не вырываем его «вверх», смотрим на текущую позицию).
  const lastIdRef = useRef<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const newest = messages[0]?.id ?? null;
    if (newest === lastIdRef.current) return;
    lastIdRef.current = newest;
    // 200px — допустимый «у дна» допуск; иначе оставляем как было.
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const statusMut = useMutation({
    mutationFn: (next: 'open' | 'closed') => supportApi.tickets.updateStatus(ticket.id, next),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  const authToken = getToken();

  // Лента отображается в обратном порядке: API возвращает desc (новые
  // сверху), а в UI новые должны быть снизу — `messages.slice().reverse()`.
  const ordered = useMemo(() => [...messages].reverse(), [messages]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'var(--bg-elev)',
        }}
      >
        {ticket.manager && (
          <Avatar name={ticket.manager.name} src={ticket.manager.avatar_url} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-body" style={{ fontWeight: 600 }}>
            {ticket.subject}
          </div>
          <div className="t-small dim">
            {ticket.manager?.name}
            {ticket.is_closed && (
              <span style={{ marginLeft: 8 }}>
                <Ic name="lock" size={11} /> закрыт
              </span>
            )}
          </div>
        </div>
        {canChangeStatus && (
          ticket.is_closed ? (
            <Button
              size="sm"
              variant="ghost"
              icon="reopen"
              loading={statusMut.isPending}
              onClick={() => statusMut.mutate('open')}
            >
              Переоткрыть
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              icon="lock"
              loading={statusMut.isPending}
              onClick={() => {
                if (confirm('Закрыть тикет? После закрытия сообщения отправить будет нельзя.'))
                  statusMut.mutate('closed');
              }}
            >
              Закрыть
            </Button>
          )
        )}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          background: 'var(--bg)',
          minHeight: 0,
        }}
      >
        {messagesQ.isLoading ? (
          <LoadingState label="Загрузка сообщений…" />
        ) : ordered.length === 0 ? (
          <div
            className="t-small dim"
            style={{ textAlign: 'center', padding: '40px 0' }}
          >
            В тикете пока нет сообщений
          </div>
        ) : (
          ordered.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              currentUserId={currentUserId}
              ticketId={ticket.id}
              authToken={authToken}
              hasReadByOther={m.read_by.some((r) => r.user_id !== currentUserId)}
            />
          ))
        )}
      </div>

      {/* Composer */}
      <Composer
        ticketId={ticket.id}
        currentUserId={currentUserId}
        disabled={ticket.is_closed}
        disabledHint="Тикет закрыт — отправка недоступна"
      />
    </div>
  );
}
