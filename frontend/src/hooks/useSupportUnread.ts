import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supportApi } from '@/api/support';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';

/**
 * Счётчик непрочитанных сообщений в поддержке — для бейджа в сайдбаре.
 *
 * Источники инвалидации:
 *  - Polling 30 с — fallback на случай, когда Reverb недоступен.
 *  - `notification.received` на личном канале — общий хук для всех
 *    in-app уведомлений, шлётся в т. ч. при новом сообщении поддержки
 *    (см. backend SupportMessageNotification).
 *  - `support.admin` — мгновенный пуш о новых тикетах для админов.
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
    onEvent: () => void qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  useRealtimeEvent({
    enabled: !!user && user.role === 'admin',
    channel: 'support.admin',
    event: 'ticket.created',
    onEvent: () => void qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  return q.data?.unread ?? 0;
}
