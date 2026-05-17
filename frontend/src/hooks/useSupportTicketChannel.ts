import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';

/**
 * Подписка на канал конкретного тикета поддержки — `support.ticket.{id}`.
 *
 * Selective invalidate по типу события — раньше тут было
 * `invalidateQueries(support.all)`, что инвалидировало 4-5 разных
 * queries (tickets-всех-видов + messages + unread) на каждое событие.
 * На быстрой переписке это давало волны лишних refetch'ей.
 *
 * Теперь:
 *  - message.created → инвалидируем messages-ленту тикета и tickets-список
 *    (там last_message_preview изменился). unread обновится отдельно
 *    через notification.received → useSupportUnread.
 *  - ticket.updated → status/edited/deleted затрагивают messages и
 *    tickets, read — только tickets (флаг прочтения у собеседника).
 *    Точнее различать по `kind` payload'а — экономим лишние refetch'и.
 *
 * Не подписываемся, если ticketId не задан — компоненту проще передавать
 * `null` пока тикет не выбран.
 */
export function useSupportTicketChannel(ticketId: number | null | undefined): void {
  const { user } = useAuth();
  const qc = useQueryClient();
  const channel = ticketId ? `support.ticket.${ticketId}` : '';
  const enabled = !!ticketId && !!user;

  useRealtimeEvent<{ ticket_id: number; message_id: number; author_id: number }>({
    enabled,
    channel,
    event: 'message.created',
    onEvent: () => {
      if (!ticketId || !user) return;
      qc.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId, user.id) });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });

  useRealtimeEvent<{ ticket_id: number; kind: string }>({
    enabled,
    channel,
    event: 'ticket.updated',
    onEvent: (payload) => {
      if (!ticketId || !user) return;
      const kind = payload?.kind ?? 'status';
      // status/edited/deleted меняют состав ленты — нужны messages.
      // read только обновляет галочки у собеседника — messages тоже нужны,
      // tickets обновляют read_by_others флаг последнего сообщения.
      qc.invalidateQueries({ queryKey: queryKeys.support.messages(ticketId, user.id) });
      if (kind !== 'read') {
        qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      } else {
        // для 'read' tickets-инвалидация тоже актуальна (last_message.read_by_others),
        // но invalidate уже у вызывающего; здесь дублируем точечно, чтобы
        // другая вкладка тоже увидела обновление.
        qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
      }
    },
  });
}
