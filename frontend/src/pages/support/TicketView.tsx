import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { LoadingState } from '@/components/ui/LoadingState';
import { Ic } from '@/components/Ic';
import {
  supportApi,
  type SupportMessage,
  type SupportTicket,
  type TicketsListResponse,
} from '@/api/support';
import { getToken } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/contexts/AuthContext';
import { useSupportTicketChannel } from '@/hooks/useSupportTicketChannel';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';
import { MessageBubble } from './MessageBubble';
import { SystemMessage } from './SystemMessage';
import { Composer } from './Composer';
import { TypingIndicator, type TypingUser } from './TypingIndicator';
import { fmtDateTimeLocal } from './time';

interface TicketViewProps {
  ticket: SupportTicket;
  currentUserId: number;
  /** Текущий пользователь — админ; владелец-менеджер тоже может закрыть свой тикет. */
  canChangeStatus: boolean;
}

type StatusAction = 'close' | 'reopen' | null;

/**
 * Память скролла по тикетам. Живёт в модуле (не в state), чтобы пережить
 * перемонтирование TicketView при свитче между тикетами. Хранит scrollTop
 * последней позиции ленты; при открытии тикета восстанавливаем — иначе
 * пользователю каждый раз сбрасывает в начало.
 *
 * Очищать после logout не нужно: при свитче аккаунта компонент
 * перерендеривается с новыми ticket.id-ами, а Map содержит безопасные числа.
 */
const scrollPositions = new Map<number, number>();

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

  // Optimistic mark-read:
  // 1) обнуляем unread_count на этом тикете во всех кэшированных
  //    списках (их может быть несколько — по разным фильтрам status);
  // 2) уменьшаем общий счётчик в сайдбаре на ту же дельту.
  // Бейджи реагируют мгновенно. Раньше badge ждал POST + 2× refetch'а
  // ≈ 1.5-3 сек до пересчёта.
  const markReadMut = useMutation({
    mutationFn: () => supportApi.tickets.markRead(ticket.id),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: ['support', 'tickets'] });
      await qc.cancelQueries({ queryKey: ['support', 'unread'] });

      let removed = 0;
      const prevTickets = qc.getQueriesData<TicketsListResponse>({
        queryKey: ['support', 'tickets'],
      });
      prevTickets.forEach(([key, data]) => {
        if (!data) return;
        qc.setQueryData<TicketsListResponse>(key, {
          ...data,
          data: data.data.map((t) => {
            if (t.id !== ticket.id) return t;
            if (t.unread_count > removed) removed = t.unread_count;
            return { ...t, unread_count: 0 };
          }),
        });
      });

      const prevUnread = qc.getQueriesData<{ unread: number }>({
        queryKey: ['support', 'unread'],
      });
      if (removed > 0) {
        prevUnread.forEach(([key, data]) => {
          if (!data) return;
          qc.setQueryData(key, { unread: Math.max(0, data.unread - removed) });
        });
      }

      return { prevTickets, prevUnread };
    },
    onError: (_err, _vars, ctx) => {
      // Откат: восстанавливаем все снимки. Mark-read идемпотентен и
      // не критичен, но без отката бейдж бы остался в «оптимистичной»
      // зелёной зоне до следующего polling-а (30 сек).
      ctx?.prevTickets.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.prevUnread.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: () => {
      // Background refresh — оптимистичный апдейт уже на экране.
      // Сетевой ответ просто заменит оптимистичные значения настоящими
      // (которые должны совпасть). Не блокирует UI.
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      qc.invalidateQueries({ queryKey: ['support', 'unread'] });
    },
  });

  const messages = messagesQ.data?.data ?? [];

  // mark-read с двух сторон, оба идемпотентны (на бэке whereNotIn по
  // уже прочитанным):
  //
  // 1) При каждом открытии тикета — БЕЗУСЛОВНО. Бэк сам определит, что
  //    нужно отметить. Так мы покрываем случаи, когда фронт о каких-то
  //    сообщениях не знает (например, до них не доскроллено и cursor
  //    pagination ещё не подтянул, или у m.author не загружен relation
  //    и фронт ошибочно не считает их непрочитанными).
  // 2) При появлении новых непрочитанных в уже открытом тикете
  //    (real-time push) — догоняем и помечаем их тоже.

  const markedTicketRef = useRef<number | null>(null);
  useEffect(() => {
    if (markedTicketRef.current === ticket.id) return;
    if (markReadMut.isPending) return;
    markReadMut.mutate();
    markedTicketRef.current = ticket.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticket.id]);

  const unreadIdsKey = useMemo(
    () =>
      messages
        .filter(
          (m: SupportMessage) =>
            !m.is_deleted &&
            m.type === 'message' &&
            m.author?.id !== currentUserId &&
            !m.read_by.some((r) => r.user_id === currentUserId),
        )
        .map((m) => m.id)
        .join(','),
    [messages, currentUserId],
  );

  useEffect(() => {
    if (unreadIdsKey.length > 0 && !markReadMut.isPending) {
      markReadMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadIdsKey]);

  // ──────── Память скролла ────────

  // Сбрасываем «уже восстановлен» при смене тикета — нужно произвести
  // восстановление заново для нового ticket.id.
  const restoredRef = useRef(false);
  useLayoutEffect(() => {
    restoredRef.current = false;
  }, [ticket.id]);

  // Восстановление позиции. Срабатывает один раз после того, как messagesQ
  // отдал первые данные — иначе scrollHeight ещё 0 и scrollTop некуда ставить.
  // Если для тикета сохранённой позиции нет — отправляем к низу (newest).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || restoredRef.current || messagesQ.isLoading) return;
    const saved = scrollPositions.get(ticket.id);
    if (saved !== undefined && saved > 0) {
      el.scrollTop = saved;
    } else {
      el.scrollTop = el.scrollHeight;
    }
    restoredRef.current = true;
  }, [ticket.id, messagesQ.isLoading, messages.length]);

  // Сохранение позиции на scroll, с rAF-троттлингом — не пишем в Map
  // на каждый wheel-event, пишем раз в кадр.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let raf: number | null = null;
    const ticketId = ticket.id;
    const onScroll = () => {
      if (raf !== null) return;
      raf = requestAnimationFrame(() => {
        scrollPositions.set(ticketId, el.scrollTop);
        raf = null;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [ticket.id]);

  // Авто-скролл к низу при новых сообщениях — только если пользователь уже
  // был внизу (допуск 200 px) и инициальное восстановление уже произошло.
  const lastIdRef = useRef<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !restoredRef.current) return;
    const newest = messages[0]?.id ?? null;
    if (newest === lastIdRef.current) return;
    lastIdRef.current = newest;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ──────── Прочее ────────

  const statusMut = useMutation({
    mutationFn: (next: 'open' | 'closed') => supportApi.tickets.updateStatus(ticket.id, next),
    onSuccess: () => {
      // Close/reopen пишет системное сообщение в ленту (SupportService) и
      // меняет ticket.status. Нужны и messages, и tickets — unread/preview
      // же останутся как были.
      qc.invalidateQueries({
        queryKey: queryKeys.support.messages(ticket.id, currentUserId),
      });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      setStatusModal(null);
    },
  });

  // ──────── Typing indicator ────────
  //
  // Эфемерный сигнал «X набирает». Композер пушит его дебаунсированно
  // (раз в 3 сек), мы держим индикатор 5 сек после последнего полученного
  // события — если человек продолжает набирать, мы получаем новые
  // событий чаще, чем таймер истечёт.
  type TypingPayload = {
    ticket_id: number;
    user_id: number;
    user_name: string;
    user_role: 'admin' | 'manager';
  };
  const [typingUsers, setTypingUsers] = useState<Map<number, TypingUser>>(new Map());
  useRealtimeEvent<TypingPayload>({
    channel: `support.ticket.${ticket.id}`,
    event: 'typing',
    onEvent: (payload) => {
      // Свой собственный сигнал игнорируем (broadcast уходит всем
      // подписчикам канала, включая отправителя).
      if (payload.user_id === currentUserId) return;
      setTypingUsers((prev) => {
        const next = new Map(prev);
        next.set(payload.user_id, {
          id: payload.user_id,
          name: payload.user_name,
          role: payload.user_role,
          lastSeen: Date.now(),
        });
        return next;
      });
    },
  });

  // Пруним устаревшие записи (>5 сек без сигнала) каждую секунду.
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers((prev) => {
        const now = Date.now();
        let changed = false;
        const next = new Map(prev);
        for (const [id, u] of next) {
          if (now - u.lastSeen > 5000) {
            next.delete(id);
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // При смене тикета сбрасываем индикатор — иначе подвисший из старого
  // тикета мог бы показаться в новом до естественного пруна.
  useEffect(() => {
    setTypingUsers(new Map());
  }, [ticket.id]);

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
              <Ic name="calendar" size={11} /> {fmtDateTimeLocal(ticket.created_at)}
            </span>
            {ticket.is_closed && ticket.closed_at && (
              <span title="Закрыт" style={{ color: 'var(--ink-2)' }}>
                <Ic name="lock" size={11} /> закрыт {fmtDateTimeLocal(ticket.closed_at)}
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

      {/* Typing indicator — между лентой и композером, маленькая полоса
          с анимированными точками и именем (или маскированным
          «Администратор» для менеджера). Скрыта, когда никто не печатает. */}
      <TypingIndicator users={typingUsers} viewerRole={viewerRole} />

      {/* Composer */}
      <Composer
        ticketId={ticket.id}
        currentUserId={currentUserId}
        disabled={ticket.is_closed}
        disabledHint="Тикет закрыт — отправка недоступна"
      />

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
