import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { Ic } from '@/components/Ic';
import { supportApi, type SupportMessage, type SupportTicket } from '@/api/support';
import { getToken } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import { fmtDateTime } from '@/lib/format';
import { useAuth } from '@/contexts/AuthContext';
import { useSupportTicketChannel } from '@/hooks/useSupportTicketChannel';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { Composer } from './Composer';

interface TicketViewProps {
  ticket: SupportTicket;
  currentUserId: number;
  /** Текущий пользователь — админ; владелец-менеджер тоже может закрыть свой тикет. */
  canChangeStatus: boolean;
}

type StatusAction = 'close' | 'reopen' | null;

export function TicketView({ ticket, currentUserId, canChangeStatus }: TicketViewProps) {
  const qc = useQueryClient();
  const { role: viewerRole } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [statusModal, setStatusModal] = useState<StatusAction>(null);

  // Real-time подписка на канал тикета — новые сообщения и правки.
  useSupportTicketChannel(ticket.id);

  const messagesQ = useQuery({
    queryKey: queryKeys.support.messages(ticket.id, currentUserId),
    queryFn: () => supportApi.messages.list(ticket.id),
    staleTime: 5_000,
  });

  const markReadMut = useMutation({
    mutationFn: () => supportApi.tickets.markRead(ticket.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  const messages = messagesQ.data?.data ?? [];
  const hasUnreadForMe = useMemo(
    () =>
      messages.some(
        (m: SupportMessage) =>
          !m.is_deleted &&
          m.type === 'message' &&
          m.author?.id !== currentUserId &&
          !m.read_by.some((r) => r.user_id === currentUserId),
      ),
    [messages, currentUserId],
  );

  useEffect(() => {
    if (hasUnreadForMe && !markReadMut.isPending) markReadMut.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasUnreadForMe]);

  // Авто-скролл к низу при появлении новых сообщений, если пользователь
  // уже был у дна (допуск 200 px); иначе не дёргаем его наверх.
  const lastIdRef = useRef<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const newest = messages[0]?.id ?? null;
    if (newest === lastIdRef.current) return;
    lastIdRef.current = newest;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const statusMut = useMutation({
    mutationFn: (next: 'open' | 'closed') => supportApi.tickets.updateStatus(ticket.id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.support.all });
      setStatusModal(null);
    },
  });

  const authToken = getToken();
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
          flexShrink: 0,
        }}
      >
        {ticket.manager && (
          <Avatar name={ticket.manager.name} src={ticket.manager.avatar_url} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="t-body" style={{ fontWeight: 600 }}>
            {ticket.subject}
          </div>
          <div
            className="t-small dim"
            style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
          >
            {ticket.manager?.name && <span>{ticket.manager.name}</span>}
            <span title="Создан">
              <Ic name="calendar" size={11} /> {fmtDateTime(ticket.created_at)}
            </span>
            {ticket.is_closed && ticket.closed_at && (
              <span title="Закрыт" style={{ color: 'var(--ink-2)' }}>
                <Ic name="lock" size={11} /> закрыт {fmtDateTime(ticket.closed_at)}
              </span>
            )}
          </div>
        </div>
        {canChangeStatus &&
          (ticket.is_closed ? (
            <Button
              size="sm"
              variant="ghost"
              icon="reopen"
              loading={statusMut.isPending}
              onClick={() => setStatusModal('reopen')}
            >
              Переоткрыть
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              icon="lock"
              loading={statusMut.isPending}
              onClick={() => setStatusModal('close')}
            >
              Закрыть
            </Button>
          ))}
      </div>

      {/* Messages */}
      <div
        ref={containerRef}
        className="support-scroll"
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
          <div className="t-small dim" style={{ textAlign: 'center', padding: '40px 0' }}>
            В тикете пока нет сообщений
          </div>
        ) : (
          ordered.map((m) =>
            m.type === 'message' ? (
              <MessageBubble
                key={m.id}
                message={m}
                currentUserId={currentUserId}
                viewerRole={viewerRole}
                ticketId={ticket.id}
                authToken={authToken}
                hasReadByOther={m.read_by.some((r) => r.user_id !== currentUserId)}
              />
            ) : (
              <SystemMessage key={m.id} message={m} viewerRole={viewerRole} />
            ),
          )
        )}
      </div>

      {/* Composer */}
      <Composer
        ticketId={ticket.id}
        currentUserId={currentUserId}
        disabled={ticket.is_closed}
        disabledHint="Тикет закрыт — отправка недоступна"
      />

      {/* Подтверждение закрытия / переоткрытия — собственная модалка вместо
          браузерного confirm: тема, тёмная-светлая, единый стиль с проектом. */}
      <Modal
        open={statusModal !== null}
        onClose={() => !statusMut.isPending && setStatusModal(null)}
        title={statusModal === 'close' ? 'Закрыть тикет?' : 'Переоткрыть тикет?'}
        width={420}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button
              variant="ghost"
              disabled={statusMut.isPending}
              onClick={() => setStatusModal(null)}
            >
              Отмена
            </Button>
            <Button
              variant={statusModal === 'close' ? 'danger' : 'primary'}
              icon={statusModal === 'close' ? 'lock' : 'reopen'}
              loading={statusMut.isPending}
              onClick={() => statusMut.mutate(statusModal === 'close' ? 'closed' : 'open')}
            >
              {statusModal === 'close' ? 'Закрыть тикет' : 'Переоткрыть'}
            </Button>
          </div>
        }
      >
        {statusModal === 'close' ? (
          <p className="t-body">
            После закрытия в тикет нельзя будет писать сообщения. Переоткрыть тикет можно
            в любой момент.
          </p>
        ) : (
          <p className="t-body">Тикет снова откроется для переписки.</p>
        )}
      </Modal>
    </div>
  );
}
