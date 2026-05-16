import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';

/**
 * Подписка на канал конкретного тикета поддержки — `support.ticket.{id}`.
 * При любом событии (новое сообщение, правка, удаление, смена статуса,
 * прочтение) инвалидируем кэш сообщений и список тикетов.
 *
 * Не подписываемся, если ticketId не задан — таким образом компоненту
 * проще передавать `null` пока тикет не выбран.
 */
export function useSupportTicketChannel(ticketId: number | null | undefined): void {
  const { user } = useAuth();
  const qc = useQueryClient();
  const channel = ticketId ? `support.ticket.${ticketId}` : '';

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: queryKeys.support.all });
  };

  useRealtimeEvent({
    enabled: !!ticketId && !!user,
    channel,
    event: 'message.created',
    onEvent: invalidate,
  });

  useRealtimeEvent({
    enabled: !!ticketId && !!user,
    channel,
    event: 'ticket.updated',
    onEvent: invalidate,
  });
}
