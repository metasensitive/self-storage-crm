import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Topbar } from '@/components/Topbar';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select } from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { supportApi, type SupportTicketStatus } from '@/api/support';
import { queryKeys } from '@/lib/queryKeys';
import { pluralize } from '@/lib/format';
import { useRealtimeEvent } from '@/lib/useRealtimeEvent';
import { TicketList } from './support/TicketList';
import { TicketView } from './support/TicketView';
import { NewTicketModal } from './support/NewTicketModal';

const pluralizeTickets = (n: number) => pluralize(n, ['тикет', 'тикета', 'тикетов']);

export default function SupportPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState<SupportTicketStatus | 'all'>('all');
  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(() => {
    const raw = searchParams.get('open');
    return raw && /^\d+$/.test(raw) ? Number(raw) : null;
  });

  const isAdmin = user?.role === 'admin';

  // Реалтайм: новые тикеты у админа — через support.admin (хук в сайдбаре
  // уже подписан, но дублировать тут не страшно — useRealtimeEvent
  // идемпотентен по комбинации канала+события на компонент).
  useRealtimeEvent({
    enabled: !!user && isAdmin,
    channel: 'support.admin',
    event: 'ticket.created',
    onEvent: () => qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  // Также подписка на personal-канал — для менеджера, чтобы при ответе
  // админа список тикетов сразу обновился без ожидания polling-а.
  useRealtimeEvent({
    enabled: !!user,
    channel: user ? `App.Models.User.${user.id}` : '',
    event: 'notification.received',
    onEvent: () => qc.invalidateQueries({ queryKey: queryKeys.support.all }),
  });

  const params = useMemo(
    () => (statusFilter === 'all' ? {} : { status: statusFilter }),
    [statusFilter],
  );

  const ticketsQ = useQuery({
    queryKey: queryKeys.support.tickets(user?.id, params),
    queryFn: () => supportApi.tickets.list(params),
    staleTime: 10_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  const tickets = ticketsQ.data?.data ?? [];

  // Deep-link: если в URL ?open=ID — авто-выбрать (если тикет есть в списке).
  useEffect(() => {
    if (selectedId == null) return;
    const exists = tickets.some((t) => t.id === selectedId);
    if (exists) {
      // Чистим query-param чтобы перезагрузка не открывала повторно.
      const p = new URLSearchParams(searchParams);
      if (p.has('open')) {
        p.delete('open');
        setSearchParams(p, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, tickets]);

  // Auto-select первый тикет при первой загрузке (если ничего не выбрано).
  useEffect(() => {
    if (selectedId == null && tickets.length > 0) {
      setSelectedId(tickets[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.length]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  if (!user) return null;

  return (
    <>
      <Topbar crumbs={['Поддержка']} />
      {/*
        Чат должен иметь фиксированную высоту с внутренним скроллом — лента
        сообщений не должна растягивать страницу. .main у нас flex column
        внутри grid (.app min-height 100vh), поэтому самый надёжный способ —
        привязать высоту контейнера к viewport минус приблизительная высота
        топбара (~65px: padding 14×2 + контент 36 + border 1).
      */}
      <div
        className="support-shell"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          height: 'calc(100vh - 65px)',
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            minHeight: 0,
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-md)',
            margin: 16,
            overflow: 'hidden',
          }}
        >
          {/* Left: tickets list */}
          <aside
            style={{
              width: 340,
              minWidth: 320,
              display: 'flex',
              flexDirection: 'column',
              borderRight: '1px solid var(--line)',
              background: 'var(--bg)',
            }}
          >
            <div
              style={{
                padding: '18px 16px 14px',
                borderBottom: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  minHeight: 32,
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="h-2" style={{ fontSize: 17, lineHeight: 1.2 }}>
                    {isAdmin ? 'Все тикеты' : 'Мои тикеты'}
                  </span>
                  <span className="t-small dim">
                    {tickets.length === 0
                      ? 'пусто'
                      : `${tickets.length} ${pluralizeTickets(tickets.length)}`}
                  </span>
                </div>
                {!isAdmin && (
                  <Button
                    size="sm"
                    variant="primary"
                    icon="plus"
                    onClick={() => setNewTicketOpen(true)}
                  >
                    Новый
                  </Button>
                )}
              </div>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as SupportTicketStatus | 'all')}
              >
                <option value="all">Все статусы</option>
                <option value="open">Открытые</option>
                <option value="closed">Закрытые</option>
              </Select>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {ticketsQ.isLoading ? (
                <LoadingState label="Загрузка…" />
              ) : ticketsQ.error ? (
                <ErrorState error={ticketsQ.error} onRetry={() => void ticketsQ.refetch()} />
              ) : (
                <TicketList
                  tickets={tickets}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                  showManager={isAdmin}
                  currentUserId={user.id}
                />
              )}
            </div>
          </aside>

          {/* Right: chat */}
          <section
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {selected ? (
              <TicketView
                key={selected.id}
                ticket={selected}
                currentUserId={user.id}
                canChangeStatus={isAdmin || selected.manager?.id === user.id}
              />
            ) : (
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg)',
                }}
              >
                <Empty
                  title={isAdmin ? 'Выберите тикет слева' : 'У вас пока нет обращений'}
                  hint={
                    isAdmin
                      ? 'Менеджеры пишут сюда — отвечайте, помечайте, закрывайте.'
                      : 'Нажмите «Новый», чтобы задать вопрос команде.'
                  }
                  action={
                    !isAdmin ? (
                      <Button
                        variant="primary"
                        icon="plus"
                        onClick={() => setNewTicketOpen(true)}
                      >
                        Новый тикет
                      </Button>
                    ) : undefined
                  }
                />
              </div>
            )}
          </section>
        </div>
      </div>

      <NewTicketModal
        open={newTicketOpen}
        onClose={() => setNewTicketOpen(false)}
        onCreated={(t) => setSelectedId(t.id)}
      />
    </>
  );
}
