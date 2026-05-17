import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/api/support';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';

/**
 * Счётчик непрочитанных сообщений в поддержке — для бейджа в сайдбаре.
 *
 * Источники инвалидации (selective — раньше тут было support.all,
 * что инвалидировало tickets и messages зря; пользователь мог быть
 * на странице с открытой лентой и каждое уведомление вызывало volna
 * refetch'ей):
 *  - Polling 30 с — fallback на случай, когда Reverb недоступен.
 *  - `notification.received` на личном канале — приходит и при support-
 *    сообщениях, и при rent/location/container/unit. Инвалидируем
 *    только unread + список тикетов (preview/last_message_at).
 *  - `support.admin` — мгновенный пуш о новых тикетах для админов:
 *    обновляем tickets и unread.
 */
export function useSupportUnread(): number {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: queryKeys.support.unread(user?.id),
    queryFn: supportApi.unreadCount,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  useRealtimeEvent({
    enabled: !!user,
    channel: user ? `App.Models.User.${user.id}` : '',
    event: 'notification.received',
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['support', 'unread'] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });

  useRealtimeEvent({
    enabled: !!user && user.role === 'admin',
    channel: 'support.admin',
    event: 'ticket.created',
    onEvent: () => {
      qc.invalidateQueries({ queryKey: ['support', 'unread'] });
      qc.invalidateQueries({ queryKey: ['support', 'tickets'] });
    },
  });

  return q.data?.unread ?? 0;
}
