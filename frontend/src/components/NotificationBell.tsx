import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useAuth } from '@/contexts/AuthContext';
import {
  notificationsApi,
  type AppNotification,
  type NotificationsListResponse,
} from '@/api/notifications';
import { queryKeys } from '@/lib/queryKeys';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';
import { Ic } from './Ic';

/** Простое относительное время — без зависимости от плагина dayjs-relativetime. */
function relTime(iso: string): string {
  const diff = Date.now() - dayjs(iso).valueOf();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'только что';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} мин назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч назад`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d} дн назад`;
  return dayjs(iso).format('D MMM');
}

/** Возвращает actor-prefix: «Вы» если это ты, иначе имя автора. */
function actorOf(n: AppNotification, currentUserId?: number): { name: string; mine: boolean } {
  const actorId = n.data.actor_id;
  const mine =
    typeof currentUserId === 'number' &&
    typeof actorId === 'number' &&
    actorId === currentUserId;
  const name = mine ? 'Вы' : ((n.data.actor_name as string | undefined) ?? 'Сотрудник');
  return { name, mine };
}

function describe(n: AppNotification, currentUserId?: number): string {
  const { name, mine } = actorOf(n, currentUserId);

  if (n.type === 'rent.created') {
    const unit = n.data.unit_number;
    const code = n.data.container_code as string | undefined;
    const where = unit ? ` №${unit}${code ? ` в ${code}` : ''}` : '';
    return `${name} ${mine ? 'создали' : 'создал'} аренду кладовки${where}`;
  }
  if (n.type === 'location.created') {
    const locName = n.data.location_name as string | undefined;
    const city = n.data.city as string | undefined;
    return `${name} ${mine ? 'добавили' : 'добавил'} локацию «${locName ?? '—'}»${
      city ? ` (${city})` : ''
    }`;
  }
  if (n.type === 'container.created') {
    const code = n.data.container_code as string | undefined;
    const loc = n.data.location_name as string | undefined;
    return `${name} ${mine ? 'добавили' : 'добавил'} контейнер ${code ?? '—'}${
      loc ? ` в локации «${loc}»` : ''
    }`;
  }
  if (n.type === 'unit.created') {
    const num = n.data.unit_number;
    const code = n.data.container_code as string | undefined;
    return `${name} ${mine ? 'добавили' : 'добавил'} кладовку №${num ?? '—'}${
      code ? ` в ${code}` : ''
    }`;
  }
  if (n.type === 'support.message') {
    const rawSender = (n.data.sender_name as string | undefined) ?? 'Сотрудник';
    const senderRole = n.data.sender_role as string | undefined;
    const subject = (n.data.subject as string | undefined) ?? '';
    // Для менеджера маскируем любого админа как обобщённый «Администратор»
    // (та же логика, что в чате) — он не должен видеть, кто из админов
    // отвечает в саппорте, чтобы это работало как единый «офис поддержки».
    // Маркер актуальной роли получателя берём из data.recipient_role, но
    // надёжнее — из текущего контекста, поэтому функцию вызываем из места,
    // где есть `currentUserRole`. Здесь же оставляем дефолт без маскировки.
    const sender = rawSender;
    void senderRole;
    return `${sender}: новое сообщение в тикете «${subject}»`;
  }
  return 'Новое событие';
}

/**
 * Описание уведомления с учётом роли получателя. Для менеджера маскируем
 * имена админов как «Администратор».
 */
function describeForRole(
  n: AppNotification,
  currentUserId: number | undefined,
  currentRole: 'admin' | 'manager' | null,
): string {
  if (n.type === 'support.message' && currentRole === 'manager') {
    const senderRole = n.data.sender_role as string | undefined;
    const subject = (n.data.subject as string | undefined) ?? '';
    if (senderRole === 'admin') {
      return `Администратор: новое сообщение в тикете «${subject}»`;
    }
  }
  return describe(n, currentUserId);
}

function deepLink(n: AppNotification): string | null {
  if (n.type === 'rent.created' && typeof n.data.rent_id === 'number') {
    return `/rents?open=${n.data.rent_id}`;
  }
  if (n.type === 'location.created' && typeof n.data.location_id === 'number') {
    return `/locations?open=${n.data.location_id}`;
  }
  if (n.type === 'container.created' && typeof n.data.container_id === 'number') {
    return `/containers?open=${n.data.container_id}`;
  }
  if (n.type === 'unit.created' && typeof n.data.unit_id === 'number') {
    return `/units?open=${n.data.unit_id}`;
  }
  if (n.type === 'support.message' && typeof n.data.ticket_id === 'number') {
    return `/support?open=${n.data.ticket_id}`;
  }
  return null;
}

export function NotificationBell() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const q = useQuery({
    queryKey: queryKeys.notifications.list(user?.id),
    queryFn: notificationsApi.list,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  // Live-пуш через Reverb: при `notification.received` инвалидируем кэш —
  // колокольчик мгновенно обновляет счётчик и список.
  useRealtimeEvent({
    enabled: !!user,
    channel: user ? `App.Models.User.${user.id}` : '',
    event: 'notification.received',
    onEvent: () => void qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  // Закрытие по клику вне / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (popRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Optimistic mark-read: бейдж непрочитанных пропадает мгновенно при
  // открытии/закрытии попапа или клике по конкретной нотификации.
  // Раньше тут был обычный invalidate-on-success, и до пересчёта badge
  // ждал POST + GET = ~1.5-3 сек (2× сетевой roundtrip до Railway).
  const markReadMut = useMutation({
    mutationFn: notificationsApi.markRead,
    onMutate: async (notificationId: string) => {
      const queryKey = queryKeys.notifications.list(user?.id);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<NotificationsListResponse>(queryKey);
      qc.setQueryData<NotificationsListResponse>(queryKey, (old) => {
        if (!old) return old;
        const target = old.data.find((n) => n.id === notificationId);
        // Уже прочитано — нечего двигать.
        if (!target || target.read_at) return old;
        return {
          ...old,
          data: old.data.map((n) =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n,
          ),
          meta: {
            ...old.meta,
            unread_count: Math.max(0, old.meta.unread_count - 1),
          },
        };
      });
      return { previous, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.queryKey, ctx.previous);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  const markAllMut = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onMutate: async () => {
      const queryKey = queryKeys.notifications.list(user?.id);
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<NotificationsListResponse>(queryKey);
      const now = new Date().toISOString();
      qc.setQueryData<NotificationsListResponse>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: old.data.map((n) => (n.read_at ? n : { ...n, read_at: now })),
          meta: { ...old.meta, unread_count: 0 },
        };
      });
      return { previous, queryKey };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(ctx.queryKey, ctx.previous);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all }),
  });

  // Авто-mark-all-read при закрытии попапа: пользователь увидел список,
  // значит уведомления больше не «новые». Идемпотентно — если непрочитанных
  // нет, не дёргаем.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current && !open) {
      const hasUnread = (q.data?.meta.unread_count ?? 0) > 0;
      if (hasUnread) markAllMut.mutate();
    }
    wasOpenRef.current = open;
    // q.data — стабильная ссылка от react-query; не вносим её в deps,
    // иначе markAllMut будет вызываться лишний раз при апдейте списка.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleItemClick(n: AppNotification) {
    if (!n.read_at) markReadMut.mutate(n.id);
    setOpen(false);
    const link = deepLink(n);
    if (link) navigate(link);
  }

  if (!user) return null;

  const items = q.data?.data ?? [];
  const unread = q.data?.meta.unread_count ?? 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={btnRef}
        type="button"
        aria-label={`Уведомления${unread > 0 ? ` (${unread} непрочитанных)` : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36,
          height: 36,
          background: 'transparent',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
          color: 'var(--ink)',
          cursor: 'pointer',
          transition: 'background .14s, border-color .14s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Ic name="bell" size={16} />
        {unread > 0 && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              borderRadius: 999,
              background: 'var(--accent)',
              color: 'var(--accent-fg)',
              fontSize: 10,
              fontWeight: 700,
              lineHeight: '18px',
              textAlign: 'center',
              boxShadow: '0 0 0 2px var(--bg)',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={popRef}
          role="dialog"
          aria-label="Уведомления"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 360,
            maxHeight: 480,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            boxShadow: 'var(--shadow-3, 0 8px 24px rgba(0,0,0,0.18))',
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <header
            style={{
              padding: '10px 14px',
              borderBottom: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span className="t-body" style={{ fontWeight: 600 }}>
              Уведомления
            </span>
            <div style={{ marginLeft: 'auto' }} />
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllMut.mutate()}
                disabled={markAllMut.isPending}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--ink-3)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px 6px',
                }}
              >
                Прочитать все
              </button>
            )}
          </header>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {items.length === 0 ? (
              <div
                style={{
                  padding: '32px 14px',
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                }}
              >
                <Ic name="bell" size={28} />
                <div className="t-small mt-2" style={{ marginTop: 8 }}>
                  Пока тихо. Новые события появятся здесь.
                </div>
              </div>
            ) : (
              items.map((n) => {
                const unreadItem = !n.read_at;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleItemClick(n)}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '10px 14px',
                      background: unreadItem ? 'var(--bg-muted)' : 'transparent',
                      border: 'none',
                      borderBottom: '1px solid var(--line)',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      className="row"
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}
                    >
                      {unreadItem && (
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: 'var(--accent)',
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="t-body"
                          style={{ fontWeight: unreadItem ? 500 : 400 }}
                        >
                          {describeForRole(n, user.id, user.role)}
                        </div>
                        <div className="t-small dim mt-1">{relTime(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
