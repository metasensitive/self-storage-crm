import { useMemo, useState } from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Topbar } from '@/components/Topbar';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Tabs } from '@/components/ui/Tabs';
import { Donut } from '@/components/charts/Donut';
import { KPI } from '@/components/charts/KPI';
import { RevenueChart } from '@/components/charts/RevenueChart';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { analyticsApi } from '@/api/analytics';
import { locationsApi } from '@/api/locations';
import { rentsApi } from '@/api/rents';
import { queryKeys } from '@/lib/queryKeys';
import { fmtMoney, pluralize } from '@/lib/format';
import type { LocationAnalytics, Rent } from '@/api/types';

type SortKey = 'income' | 'occupancy' | 'units';
type PeriodDays = 7 | 30 | 90;

function buildRevenueSeries(rents: Rent[], days: PeriodDays, endOffset = 0) {
  const today = dayjs().startOf('day').subtract(endOffset, 'day');
  const start = today.subtract(days - 1, 'day');
  const buckets: Record<string, number> = {};
  for (let i = 0; i < days; i += 1) {
    buckets[start.add(i, 'day').format('YYYY-MM-DD')] = 0;
  }
  for (const r of rents) {
    const key = dayjs(r.created_at).format('YYYY-MM-DD');
    if (key in buckets) buckets[key] += Number(r.price) || 0;
  }
  return Object.entries(buckets).map(([date, value]) => ({ date, value }));
}

export default function AnalyticsPage() {
  const [sortKey, setSortKey] = useState<SortKey>('income');

  const networkQ = useQuery({
    queryKey: queryKeys.analytics.network(),
    queryFn: analyticsApi.network,
  });

  const locationsQ = useQuery({
    queryKey: queryKeys.locations.list({ all: true }),
    queryFn: () => locationsApi.list({ page: 1 }),
  });

  const activeRentsQ = useQuery({
    queryKey: queryKeys.rents.list({ status: 'active', page: 1 }),
    queryFn: () => rentsApi.list({ status: 'active', page: 1 }),
  });

  const finishedRentsQ = useQuery({
    queryKey: queryKeys.rents.list({ status: 'finished', page: 1 }),
    queryFn: () => rentsApi.list({ status: 'finished', page: 1 }),
  });

  const allRevenueRents = useMemo(
    () => [...(activeRentsQ.data?.data ?? []), ...(finishedRentsQ.data?.data ?? [])],
    [activeRentsQ.data, finishedRentsQ.data],
  );

  const [revenuePeriod, setRevenuePeriod] = useState<PeriodDays>(30);

  const locations = useMemo(() => locationsQ.data?.data ?? [], [locationsQ.data]);
  const statsQ = useQueries({
    queries: locations.map((l) => ({
      queryKey: queryKeys.analytics.location(l.id),
      queryFn: () => analyticsApi.location(l.id),
      enabled: locations.length > 0,
    })),
  });

  const ranked = useMemo(() => {
    const rows = locations
      .map((l, i) => ({
        location: l,
        stats: statsQ[i]?.data as LocationAnalytics | undefined,
      }))
      .filter((r) => r.stats != null);

    const sorted = [...rows].sort((a, b) => {
      if (sortKey === 'income') return b.stats!.monthly_income - a.stats!.monthly_income;
      if (sortKey === 'occupancy')
        return b.stats!.occupancy_percent - a.stats!.occupancy_percent;
      return b.stats!.total_units - a.stats!.total_units;
    });
    return sorted;
  }, [locations, statsQ, sortKey]);

  const revenueSeries = useMemo(
    () => buildRevenueSeries(allRevenueRents, revenuePeriod),
    [allRevenueRents, revenuePeriod],
  );
  const prevRevenueSeries = useMemo(
    () => buildRevenueSeries(allRevenueRents, revenuePeriod, revenuePeriod),
    [allRevenueRents, revenuePeriod],
  );

  const revenueSummary = useMemo(() => {
    const total = revenueSeries.reduce((s, p) => s + p.value, 0);
    const prevTotal = prevRevenueSeries.reduce((s, p) => s + p.value, 0);
    const avg = total / revenueSeries.length;
    const trend = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;
    return { total, avg, trend };
  }, [revenueSeries, prevRevenueSeries]);

  const hasRevenue = revenueSeries.some((p) => p.value > 0);

  const isLoading = networkQ.isLoading || locationsQ.isLoading;
  const error = networkQ.error ?? locationsQ.error;

  const allStatsLoaded = statsQ.length > 0 && statsQ.every((q) => !q.isLoading);

  return (
    <>
      <Topbar crumbs={['Аналитика']} />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Сводка по сети</span>
            <h1 className="h-display">Аналитика</h1>
            <span className="muted t-body">
              Заполняемость, доход и распределение по локациям.
            </span>
          </div>
        </div>

        {isLoading ? (
          <LoadingState label="Загрузка аналитики…" />
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={() => {
              void networkQ.refetch();
              void locationsQ.refetch();
            }}
          />
        ) : networkQ.data ? (
          <>
            {/* Network KPI */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 14,
              }}
            >
              <KPI
                label="Всего кладовок"
                value={networkQ.data.total_units}
                sub={`${locations.length} локаций`}
              />
              <KPI
                label="Заполняемость"
                value={Math.round(networkQ.data.occupancy_percent)}
                unit="%"
                sub={`${networkQ.data.occupied_units} из ${networkQ.data.total_units}`}
              />
              <KPI
                label="Доход (текущий месяц)"
                value={fmtMoney(networkQ.data.monthly_income, { compact: true }).replace(
                  ' ₽',
                  '',
                )}
                unit="₽"
                sub="по всем активным арендам"
              />
              <KPI
                label="В работе"
                value={networkQ.data.rented_units + networkQ.data.reserved_units}
                sub={`${networkQ.data.reserved_units} в резерве, ${networkQ.data.blocked_units} блок.`}
              />
            </div>

            {/* Distribution + Revenue */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 2fr',
                gap: 14,
                marginTop: 14,
              }}
            >
              {/* Donut + segment */}
              <div className="card">
                <div className="card-head">
                  <div className="col">
                    <span className="t-micro">Распределение</span>
                    <span className="h-2 mt-1">Статусы кладовок</span>
                  </div>
                </div>
                <div
                  className="card-body"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
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
                  <div className="col gap-2" style={{ width: '100%' }}>
                    {(
                      [
                        ['Арендовано', networkQ.data.rented_units, 'var(--st-rented)'],
                        ['Резерв', networkQ.data.reserved_units, 'var(--st-reserved)'],
                        ['Свободно', networkQ.data.free_units, 'var(--st-free)'],
                        ['Блокировка', networkQ.data.blocked_units, 'var(--st-blocked)'],
                      ] as const
                    ).map(([l, v, c]) => {
                      const pct =
                        networkQ.data!.total_units > 0
                          ? Math.round((v / networkQ.data!.total_units) * 100)
                          : 0;
                      return (
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
                          <div className="row gap-3">
                            <span className="mono tnum">{v}</span>
                            <span className="t-small dim mono tnum" style={{ minWidth: 36, textAlign: 'right' }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Revenue chart */}
              <div className="card">
                <div className="card-head">
                  <div className="col">
                    <span className="t-micro">Доход</span>
                    <span className="h-2 mt-1">
                      Поступления за {revenuePeriod}{' '}
                      {pluralize(revenuePeriod, ['день', 'дня', 'дней'])}
                    </span>
                  </div>
                  <Tabs
                    tabs={[
                      { id: '7', label: '7 дней' },
                      { id: '30', label: '30 дней' },
                      { id: '90', label: '90 дней' },
                    ]}
                    value={String(revenuePeriod)}
                    onChange={(id) => setRevenuePeriod(Number(id) as PeriodDays)}
                  />
                </div>
                <div className="card-body">
                  {hasRevenue ? (
                    <>
                      <div
                        className="row gap-6"
                        style={{
                          alignItems: 'baseline',
                          flexWrap: 'wrap',
                          marginBottom: 16,
                        }}
                      >
                        <div className="col">
                          <span className="t-micro">Всего</span>
                          <span
                            className="serif tnum mt-1"
                            style={{ fontSize: 30, lineHeight: 1, letterSpacing: '-0.02em' }}
                          >
                            {fmtMoney(revenueSummary.total, { compact: true })}
                          </span>
                        </div>
                        <div className="col">
                          <span className="t-micro">В среднем / день</span>
                          <span
                            className="serif tnum mt-1"
                            style={{ fontSize: 22, lineHeight: 1.1 }}
                          >
                            {fmtMoney(revenueSummary.avg, { compact: true })}
                          </span>
                        </div>
                        {revenueSummary.trend != null && (
                          <div className="col">
                            <span className="t-micro">vs прошлый период</span>
                            <span
                              className="mono tnum mt-1"
                              style={{
                                fontSize: 18,
                                color:
                                  revenueSummary.trend >= 0
                                    ? 'oklch(0.45 0.10 150)'
                                    : 'oklch(0.50 0.10 25)',
                              }}
                            >
                              {revenueSummary.trend > 0 ? '↑' : '↓'}{' '}
                              {Math.abs(revenueSummary.trend).toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <RevenueChart data={revenueSeries} height={260} />
                    </>
                  ) : (
                    <div
                      className="t-small dim"
                      style={{
                        height: 260,
                        display: 'grid',
                        placeItems: 'center',
                        textAlign: 'center',
                      }}
                    >
                      За выбранный период нет аренд для построения графика.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Locations ranking */}
            <div className="card mt-4">
              <div className="card-head">
                <div className="col">
                  <span className="t-micro">Локации</span>
                  <span className="h-2 mt-1">Рейтинг локаций</span>
                </div>
                <Tabs
                  tabs={[
                    { id: 'income', label: 'По доходу' },
                    { id: 'occupancy', label: 'По заполняемости' },
                    { id: 'units', label: 'По объёму' },
                  ]}
                  value={sortKey}
                  onChange={(id) => setSortKey(id)}
                />
              </div>

              {locations.length === 0 ? (
                <div className="card-body">
                  <Empty title="Локаций ещё нет" hint="Создайте первую локацию, чтобы увидеть статистику." />
                </div>
              ) : !allStatsLoaded ? (
                <div className="card-body">
                  <LoadingState inline label="Подгрузка статистики по локациям…" />
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Локация</th>
                      <th>Кладовки</th>
                      <th>Заполняемость</th>
                      <th className="num">Доход (мес.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranked.map((row, i) => {
                      const s = row.stats!;
                      return (
                        <tr key={row.location.id}>
                          <td className="mono dim tnum">{i + 1}</td>
                          <td>
                            <div className="col">
                              <span style={{ fontWeight: 500 }}>{row.location.name}</span>
                              <span className="t-small">{row.location.city}</span>
                            </div>
                          </td>
                          <td className="tnum">
                            <span className="muted">
                              {s.occupied_units}/{s.total_units}
                            </span>
                          </td>
                          <td>
                            <div className="row gap-2" style={{ minWidth: 200 }}>
                              <SegmentBar
                                free={s.free_units}
                                rented={s.rented_units}
                                reserved={s.reserved_units}
                                blocked={s.blocked_units}
                              />
                              <span
                                className="tnum t-small"
                                style={{ minWidth: 46, textAlign: 'right' }}
                              >
                                {Math.round(s.occupancy_percent)}%
                              </span>
                            </div>
                          </td>
                          <td className="num tnum">
                            {fmtMoney(s.monthly_income, { compact: true })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
