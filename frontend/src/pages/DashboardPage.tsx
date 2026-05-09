import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Topbar } from '@/components/Topbar';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { AreaChart } from '@/components/charts/AreaChart';
import { Donut } from '@/components/charts/Donut';
import { KPI } from '@/components/charts/KPI';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { Ic } from '@/components/Ic';
import { useAuth } from '@/contexts/AuthContext';
import { analyticsApi } from '@/api/analytics';
import { locationsApi } from '@/api/locations';
import { rentsApi } from '@/api/rents';
import { containersApi } from '@/api/containers';
import { queryKeys } from '@/lib/queryKeys';
import { buildContainerMap } from '@/lib/enrich';
import { fmtDate, fmtMoney, pluralize } from '@/lib/format';
import type { Rent } from '@/api/types';

function greeting(name: string): string {
  const h = new Date().getHours();
  const first = name.split(' ')[0];
  if (h < 6) return `Доброй ночи, ${first}`;
  if (h < 12) return `Доброе утро, ${first}`;
  if (h < 18) return `Добрый день, ${first}`;
  return `Добрый вечер, ${first}`;
}

function buildRevenueSeries(rents: Rent[], days = 30): { date: string; value: number }[] {
  const today = dayjs().startOf('day');
  const start = today.subtract(days - 1, 'day');
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i += 1) {
    buckets[start.add(i, 'day').format('YYYY-MM-DD')] = 0;
  }
  for (const r of rents) {
    const key = dayjs(r.created_at).format('YYYY-MM-DD');
    if (key in buckets) {
      buckets[key] += Number(r.price) || 0;
    }
  }
  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

export default function DashboardPage() {
  const { user } = useAuth();

  const networkQ = useQuery({
    queryKey: queryKeys.analytics.network(),
    queryFn: analyticsApi.network,
  });

  const locationsQ = useQuery({
    queryKey: queryKeys.locations.list({ page: 1 }),
    queryFn: () => locationsApi.list({ page: 1 }),
  });

  const activeRentsQ = useQuery({
    queryKey: queryKeys.rents.list({ status: 'active', page: 1 }),
    queryFn: () => rentsApi.list({ status: 'active', page: 1 }),
  });

  const containersQ = useQuery({
    queryKey: queryKeys.containers.list({ all: true }),
    queryFn: () => containersApi.list({ page: 1 }),
  });

  const containerMap = useMemo(
    () => buildContainerMap(containersQ.data?.data ?? []),
    [containersQ.data],
  );

  // Аналитика для топ-5 локаций — параллельные запросы
  const topLocations = locationsQ.data?.data.slice(0, 5) ?? [];
  const locationStatsQ = useQueries({
    queries: topLocations.map((l) => ({
      queryKey: queryKeys.analytics.location(l.id),
      queryFn: () => analyticsApi.location(l.id),
      enabled: topLocations.length > 0,
    })),
  });

  const expiringRents = useMemo(() => {
    const list = activeRentsQ.data?.data ?? [];
    const today = dayjs().startOf('day');
    return list
      .map((r) => ({ rent: r, days: dayjs(r.date_to).startOf('day').diff(today, 'day') }))
      .filter((x) => x.days >= 0 && x.days <= 7)
      .sort((a, b) => a.days - b.days)
      .slice(0, 6);
  }, [activeRentsQ.data]);

  const revenueSeries = useMemo(
    () => buildRevenueSeries(activeRentsQ.data?.data ?? [], 30),
    [activeRentsQ.data],
  );
  const hasRevenue = revenueSeries.some((p) => p.value > 0);

  const isLoading = networkQ.isLoading || locationsQ.isLoading || activeRentsQ.isLoading;
  const error = networkQ.error ?? locationsQ.error ?? activeRentsQ.error;

  return (
    <>
      <Topbar
        crumbs={['Дашборд']}
        actions={
          <>
            <Link to="/rents" className="btn sm" style={{ textDecoration: 'none' }}>
              <Ic name="receipt" className="ic" /> Все аренды
            </Link>
          </>
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">
              {dayjs().format('dddd, D MMMM').replace(/^./, (c) => c.toUpperCase())}
            </span>
            <h1 className="h-display">{user ? greeting(user.name) : 'Дашборд'}.</h1>
            <span className="muted t-body">Сводка по сети — обновляется в реальном времени.</span>
          </div>
        </div>

        {error && !isLoading ? (
          <ErrorState
            error={error}
            title="Не удалось загрузить дашборд"
            onRetry={() => {
              void networkQ.refetch();
              void locationsQ.refetch();
              void activeRentsQ.refetch();
            }}
          />
        ) : isLoading ? (
          <LoadingState label="Загрузка показателей…" />
        ) : (
          <>
            {/* KPI */}
            {networkQ.data && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KPI
                  label="Заполняемость"
                  value={Math.round(networkQ.data.occupancy_percent)}
                  unit="%"
                  sub={`${networkQ.data.occupied_units} из ${networkQ.data.total_units} занято`}
                />
                <KPI
                  label="Доход (текущий месяц)"
                  value={fmtMoney(networkQ.data.monthly_income, { compact: true }).replace(' ₽', '')}
                  unit="₽"
                  sub="к сегодняшнему дню"
                />
                <KPI
                  label="Активные аренды"
                  value={networkQ.data.rented_units + networkQ.data.reserved_units}
                  sub={`${networkQ.data.reserved_units} в резерве`}
                />
                <KPI
                  label="Свободно"
                  value={networkQ.data.free_units}
                  sub={`${networkQ.data.blocked_units} заблокировано`}
                />
              </div>
            )}

            {/* Charts row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr',
                gap: 14,
                marginTop: 14,
              }}
            >
              <div className="card">
                <div className="card-head">
                  <div className="col">
                    <span className="t-micro">Доход</span>
                    <span className="h-2 mt-1">Поступления за 30 дней</span>
                  </div>
                </div>
                <div className="card-body">
                  {hasRevenue ? (
                    <AreaChart data={revenueSeries} height={240} />
                  ) : (
                    <div
                      className="t-small dim"
                      style={{
                        height: 240,
                        display: 'grid',
                        placeItems: 'center',
                        textAlign: 'center',
                      }}
                    >
                      Недостаточно активных аренд за последний месяц для построения графика.
                    </div>
                  )}
                </div>
              </div>

              {networkQ.data && (
                <div className="card">
                  <div className="card-head">
                    <div className="col">
                      <span className="t-micro">Распределение</span>
                      <span className="h-2 mt-1">Статусы кладовок</span>
                    </div>
                  </div>
                  <div
                    className="card-body"
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    <div className="donut-wrap">
                      <Donut
                        size={170}
                        thickness={18}
                        segs={[
                          { value: networkQ.data.rented_units, color: 'var(--st-rented)' },
                          { value: networkQ.data.reserved_units, color: 'var(--st-reserved)' },
                          { value: networkQ.data.free_units, color: 'var(--st-free)' },
                          { value: networkQ.data.blocked_units, color: 'var(--st-blocked)' },
                        ]}
                      />
                      <div className="donut-center">
                        <div className="serif" style={{ fontSize: 32, lineHeight: 1 }}>
                          {Math.round(networkQ.data.occupancy_percent)}
                          <span style={{ fontSize: 14, color: 'var(--ink-3)' }}>%</span>
                        </div>
                        <div className="t-small">занято</div>
                      </div>
                    </div>
                    <div className="col gap-2 mt-4" style={{ width: '100%' }}>
                      {(
                        [
                          ['Арендовано', networkQ.data.rented_units, 'var(--st-rented)'],
                          ['Резерв', networkQ.data.reserved_units, 'var(--st-reserved)'],
                          ['Свободно', networkQ.data.free_units, 'var(--st-free)'],
                          ['Блокировка', networkQ.data.blocked_units, 'var(--st-blocked)'],
                        ] as const
                      ).map(([l, v, c]) => (
                        <div
                          key={l}
                          className="row"
                          style={{ justifyContent: 'space-between' }}
                        >
                          <div className="row gap-2">
                            <span
                              style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: c,
                              }}
                            />
                            <span className="t-body">{l}</span>
                          </div>
                          <span className="mono tnum">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Top locations */}
            <div className="card mt-4">
              <div className="card-head">
                <div className="col">
                  <span className="t-micro">Локации</span>
                  <span className="h-2 mt-1">Топ по объёму</span>
                </div>
                <Link
                  to="/locations"
                  className="btn sm btn-ghost"
                  style={{ textDecoration: 'none' }}
                >
                  Все локации
                </Link>
              </div>
              {topLocations.length === 0 ? (
                <div className="card-body">
                  <Empty
                    title="Локаций ещё нет"
                    hint="Создайте первую локацию, чтобы увидеть здесь сводку."
                    action={
                      <Link
                        to="/locations"
                        className="btn btn-primary sm"
                        style={{ textDecoration: 'none' }}
                      >
                        К локациям
                      </Link>
                    }
                  />
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Локация</th>
                      <th>Контейнеры</th>
                      <th>Кладовки</th>
                      <th>Заполняемость</th>
                      <th className="num">Доход (мес.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topLocations.map((l, i) => {
                      const stats = locationStatsQ[i]?.data;
                      return (
                        <tr key={l.id}>
                          <td>
                            <div className="col">
                              <span style={{ fontWeight: 500 }}>{l.name}</span>
                              <span className="t-small">{l.city}</span>
                            </div>
                          </td>
                          <td className="tnum">{l.containers_count}</td>
                          <td className="tnum">
                            <span className="muted">
                              {stats
                                ? `${stats.occupied_units}/${stats.total_units}`
                                : `—/${l.units_count}`}
                            </span>
                          </td>
                          <td>
                            <div className="row gap-2" style={{ minWidth: 160 }}>
                              {stats ? (
                                <>
                                  <SegmentBar
                                    free={stats.free_units}
                                    rented={stats.rented_units}
                                    reserved={stats.reserved_units}
                                    blocked={stats.blocked_units}
                                  />
                                  <span
                                    className="tnum t-small"
                                    style={{ minWidth: 46, textAlign: 'right' }}
                                  >
                                    {Math.round(stats.occupancy_percent)}%
                                  </span>
                                </>
                              ) : (
                                <span className="t-small dim">…</span>
                              )}
                            </div>
                          </td>
                          <td className="num tnum">
                            {stats ? fmtMoney(stats.monthly_income, { compact: true }) : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Expiring rents */}
            <div className="card mt-4">
              <div className="card-head">
                <div className="col">
                  <span className="t-micro">Внимание</span>
                  <span className="h-2 mt-1">Аренды, истекающие в ближайшие 7 дней</span>
                </div>
                <Link
                  to="/rents"
                  className="btn sm btn-ghost"
                  style={{ textDecoration: 'none' }}
                >
                  К арендам
                </Link>
              </div>
              {expiringRents.length === 0 ? (
                <div className="card-body">
                  <Empty title="Нет истекающих аренд" hint="В ближайшие 7 дней ничего не заканчивается." />
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Кладовка</th>
                      <th>Локация</th>
                      <th>Период</th>
                      <th>Осталось</th>
                      <th className="num">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expiringRents.map(({ rent, days }) => {
                      const cont = containerMap.get(rent.unit?.container?.id ?? -1);
                      const code = cont?.code ?? rent.unit?.container?.code;
                      const loc = cont?.location ?? rent.unit?.container?.location;
                      const dayLabel =
                        days === 0
                          ? 'сегодня'
                          : `${days} ${pluralize(days, ['день', 'дня', 'дней'])}`;
                      const tone =
                        days <= 2 ? 'blocked' : days <= 5 ? 'reserved' : 'active';
                      return (
                        <tr key={rent.id}>
                          <td>
                            <span className="mono">
                              {code ? `${code} / ` : ''}#{rent.unit?.number ?? '—'}
                            </span>
                          </td>
                          <td>
                            {loc ? (
                              <div className="col">
                                <span style={{ fontWeight: 500 }}>{loc.name}</span>
                                <span className="t-small">{loc.city}</span>
                              </div>
                            ) : (
                              <span className="dim">—</span>
                            )}
                          </td>
                          <td className="t-small">
                            {fmtDate(rent.date_from)} → {fmtDate(rent.date_to)}
                          </td>
                          <td>
                            <span className={`badge ${tone}`}>
                              <span className="dot" />
                              {dayLabel}
                            </span>
                          </td>
                          <td className="num tnum">{fmtMoney(rent.price)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

