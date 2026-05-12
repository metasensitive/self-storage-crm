import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { Topbar } from '@/components/Topbar';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Drawer, DrawerBody, DrawerFoot, DrawerHead } from '@/components/ui/Drawer';
import { useToast, useToastError } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { rentsApi } from '@/api/rents';
import { unitsApi } from '@/api/units';
import { locationsApi } from '@/api/locations';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { fmtDate, fmtMoney, pluralize } from '@/lib/format';
import type { Rent, RentStatus, Unit } from '@/api/types';

const STATUS_OPTIONS: Array<{ value: RentStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'finished', label: 'Завершённые' },
  { value: 'cancelled', label: 'Отменённые' },
];

const MIN_DAYS = 10;

interface RentsLocationState {
  openCreate?: boolean;
  unitId?: number;
}

export default function RentsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();
  const location = useLocation();
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<RentStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<number | 'all'>('all');
  const [drawerRent, setDrawerRent] = useState<Rent | null>(null);
  const [creating, setCreating] = useState<{ open: boolean; unitId?: number }>({ open: false });

  // Подхват открытия модалки из UnitsPage через router state
  useEffect(() => {
    const state = location.state as RentsLocationState | null;
    if (state?.openCreate) {
      setCreating({ open: true, unitId: state.unitId });
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);

  const params = useMemo(
    () => ({
      page,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(locationFilter !== 'all' ? { location_id: locationFilter as number } : {}),
    }),
    [page, statusFilter, locationFilter],
  );

  const listQ = useQuery({
    queryKey: queryKeys.rents.list(params),
    queryFn: () => rentsApi.list(params),
  });

  const locationsQ = useQuery({
    queryKey: queryKeys.locations.list({ all: true }),
    queryFn: () => locationsApi.list({ page: 1 }),
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data]);
  const meta = listQ.data?.meta;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.rents.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };

  const finishMut = useMutation({
    mutationFn: (id: number) => rentsApi.finish(id),
    onSuccess: (updated) => {
      toast.success('Аренда завершена');
      setDrawerRent(updated);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось завершить аренду'),
  });

  return (
    <>
      <Topbar
        crumbs={['Аренды']}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon="plus"
            onClick={() => setCreating({ open: true })}
          >
            Оформить аренду
          </Button>
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Аренды</span>
            <h1 className="h-display">Договоры на хранение</h1>
            <span className="muted t-body">
              {meta ? `${meta.total} записей всего` : 'Активные и завершённые аренды.'}
            </span>
          </div>
        </div>

        <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as RentStatus | 'all');
            }}
            style={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          <Select
            value={String(locationFilter)}
            onChange={(e) => {
              setPage(1);
              setLocationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
            }}
            style={{ width: 240 }}
          >
            <option value="all">Все локации</option>
            {locationsQ.data?.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.city}
              </option>
            ))}
          </Select>
        </div>

        {listQ.isLoading ? (
          <LoadingState label="Загрузка аренд…" />
        ) : listQ.error ? (
          <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
        ) : items.length === 0 ? (
          <Empty
            title="Аренд пока нет"
            hint="Оформите первую аренду, чтобы начать сдавать кладовки."
            action={
              <Button variant="primary" icon="plus" onClick={() => setCreating({ open: true })}>
                Оформить аренду
              </Button>
            }
          />
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Кладовка</th>
                  <th>Локация</th>
                  <th>Период</th>
                  <th>Дней</th>
                  <th>Статус</th>
                  <th className="num">Сумма</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => {
                  const code = r.unit?.container?.code;
                  const loc = r.unit?.container?.location;
                  const days = dayjs(r.date_to).diff(dayjs(r.date_from), 'day') + 1;
                  return (
                    <tr key={r.id} onClick={() => setDrawerRent(r)}>
                      <td>
                        <span className="mono">
                          {code ? `${code} / ` : ''}
                          #{r.unit?.number ?? '—'}
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
                        {fmtDate(r.date_from)} → {fmtDate(r.date_to)}
                      </td>
                      <td className="tnum">{days}</td>
                      <td>
                        <StatusBadge kind="rent" status={r.status} />
                      </td>
                      <td className="num tnum">{fmtMoney(r.price)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <IconButton
                          icon="chev_r"
                          label="Открыть"
                          onClick={() => setDrawerRent(r)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && (
          <div
            className="row gap-2 mt-6"
            style={{ justifyContent: 'center', alignItems: 'center' }}
          >
            <Button
              size="sm"
              icon="chev_l"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <span className="t-small mono tnum" style={{ minWidth: 60, textAlign: 'center' }}>
              {meta.current_page} / {meta.last_page}
            </span>
            <Button
              size="sm"
              iconRight="chev_r"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Дальше
            </Button>
          </div>
        )}
      </div>

      {/* Drawer */}
      <Drawer open={drawerRent != null} onClose={() => setDrawerRent(null)} width={620}>
        {drawerRent && (
          <RentDrawerContent
            rent={drawerRent}
            code={drawerRent.unit?.container?.code}
            loc={drawerRent.unit?.container?.location}
            onClose={() => setDrawerRent(null)}
            onFinish={() => finishMut.mutate(drawerRent.id)}
            finishing={finishMut.isPending}
          />
        )}
      </Drawer>

      {/* Create modal */}
      {creating.open && (
        <CreateRentModal
          presetUnitId={creating.unitId}
          onClose={() => setCreating({ open: false })}
          onSuccess={() => {
            setCreating({ open: false });
            toast.success('Аренда оформлена');
            invalidate();
          }}
        />
      )}
    </>
  );
}

interface RentDrawerProps {
  rent: Rent;
  code?: string;
  loc?: { name: string; city: string };
  onClose: () => void;
  onFinish: () => void;
  finishing: boolean;
}

function RentDrawerContent({ rent, code, loc, onClose, onFinish, finishing }: RentDrawerProps) {
  const today = dayjs().startOf('day');
  const from = dayjs(rent.date_from).startOf('day');
  const to = dayjs(rent.date_to).startOf('day');
  const totalDays = to.diff(from, 'day') + 1;
  const elapsed = Math.max(0, Math.min(totalDays, today.diff(from, 'day') + 1));
  const remaining = Math.max(0, to.diff(today, 'day'));
  const pct = totalDays > 0 ? Math.round((elapsed / totalDays) * 100) : 0;

  return (
    <>
      <DrawerHead>
        <div className="col gap-2 grow">
          <div className="row gap-2">
            <span className="t-micro">Аренда</span>
            <StatusBadge kind="rent" status={rent.status} />
          </div>
          <span className="h-display-sm mono">
            {code ? `${code} / ` : ''}#{rent.unit?.number ?? '—'}
          </span>
          {loc && (
            <span className="muted t-small">
              {loc.name} · {loc.city}
            </span>
          )}
        </div>
        <IconButton icon="close" label="Закрыть" onClick={onClose} />
      </DrawerHead>
      <DrawerBody>
        <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div className="kpi">
              <div className="label">Период</div>
              <div className="value" style={{ fontSize: 18 }}>
                {totalDays}
                <span className="unit">{pluralize(totalDays, ['день', 'дня', 'дней'])}</span>
              </div>
            </div>
            <div className="kpi">
              <div className="label">Сумма</div>
              <div className="value">
                {fmtMoney(rent.price, { compact: true }).replace(' ₽', '')}
                <span className="unit">₽</span>
              </div>
            </div>
            <div className="kpi">
              <div className="label">{rent.status === 'active' ? 'Осталось' : 'Прошло'}</div>
              <div className="value" style={{ fontSize: 18 }}>
                {rent.status === 'active' ? remaining : totalDays}
                <span className="unit">
                  {pluralize(rent.status === 'active' ? remaining : totalDays, [
                    'день',
                    'дня',
                    'дней',
                  ])}
                </span>
              </div>
            </div>
          </div>

          {rent.status === 'active' && (
            <div className="col gap-2">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-small">{fmtDate(rent.date_from)}</span>
                <span className="t-small mono tnum">{pct}%</span>
                <span className="t-small">{fmtDate(rent.date_to)}</span>
              </div>
              <div
                className="bar"
                style={{ height: 10, background: 'var(--bg-sunken)', borderRadius: 99 }}
              >
                <span
                  style={{
                    display: 'block',
                    height: '100%',
                    width: `${pct}%`,
                    background: 'var(--st-rented)',
                    borderRadius: 99,
                    transition: 'width .3s ease',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <span className="t-micro">Период</span>
            <div className="t-body mono mt-1">
              {fmtDate(rent.date_from)} → {fmtDate(rent.date_to)}
            </div>
          </div>

          <div>
            <span className="t-micro">Создана</span>
            <div className="t-body mt-1">{fmtDate(rent.created_at)}</div>
          </div>
        </div>
      </DrawerBody>
      {rent.status === 'active' && (
        <DrawerFoot>
          <div className="grow" />
          <Button
            variant="primary"
            icon="check"
            loading={finishing}
            onClick={onFinish}
          >
            Завершить аренду
          </Button>
        </DrawerFoot>
      )}
    </>
  );
}

const createSchema = z
  .object({
    unit_id: z
      .number({ invalid_type_error: 'Выберите кладовку' })
      .int()
      .positive('Выберите кладовку'),
    date_from: z.string().min(1, 'Укажите дату начала'),
    date_to: z.string().min(1, 'Укажите дату окончания'),
    price_override: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const from = dayjs(data.date_from).startOf('day');
    const to = dayjs(data.date_to).startOf('day');
    const today = dayjs().startOf('day');
    if (!from.isValid()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_from'], message: 'Неверная дата' });
      return;
    }
    if (!to.isValid()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['date_to'], message: 'Неверная дата' });
      return;
    }
    if (from.isBefore(today)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_from'],
        message: 'Дата начала не может быть в прошлом',
      });
    }
    const days = to.diff(from, 'day') + 1;
    if (days < MIN_DAYS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_to'],
        message: `Минимальный срок — ${MIN_DAYS} дней`,
      });
    }
    if (data.price_override && data.price_override.length > 0) {
      const n = Number(data.price_override);
      if (!Number.isFinite(n) || n < 0 || n > 99_999_999.99) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['price_override'],
          message: 'Цена от 0 до 99 999 999.99',
        });
      }
    }
  });

type CreateValues = z.infer<typeof createSchema>;

interface CreateRentProps {
  presetUnitId?: number;
  onClose: () => void;
  onSuccess: () => void;
}

function CreateRentModal({ presetUnitId, onClose, onSuccess }: CreateRentProps) {
  const toast = useToast();

  const freeUnitsQ = useQuery({
    queryKey: queryKeys.units.list({ status: 'free', forCreate: true }),
    queryFn: () => unitsApi.list({ status: 'free', page: 1 }),
  });

  // Если presetUnitId переданa и она НЕ в первой странице free — отдельно загрузим её,
  // чтобы кладовка была доступна в селекте.
  const presetUnitQ = useQuery({
    queryKey: presetUnitId ? queryKeys.units.detail(presetUnitId) : ['noop'],
    queryFn: () => unitsApi.show(presetUnitId!),
    enabled: !!presetUnitId,
  });

  const units = useMemo(() => {
    const list = freeUnitsQ.data?.data ?? [];
    if (presetUnitQ.data && !list.some((u) => u.id === presetUnitQ.data!.id)) {
      return [presetUnitQ.data, ...list];
    }
    return list;
  }, [freeUnitsQ.data, presetUnitQ.data]);

  const todayStr = dayjs().format('YYYY-MM-DD');
  const minToStr = dayjs().add(MIN_DAYS - 1, 'day').format('YYYY-MM-DD');

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      unit_id: presetUnitId ?? 0,
      date_from: todayStr,
      date_to: minToStr,
      price_override: '',
    },
  });

  const selectedUnitId = watch('unit_id');
  const dateFrom = watch('date_from');
  const dateTo = watch('date_to');
  const priceOverride = watch('price_override');

  const selectedUnit: Unit | undefined = units.find((u) => u.id === Number(selectedUnitId));

  const days = useMemo(() => {
    const f = dayjs(dateFrom);
    const t = dayjs(dateTo);
    if (!f.isValid() || !t.isValid()) return 0;
    return Math.max(0, t.diff(f, 'day') + 1);
  }, [dateFrom, dateTo]);

  const computedPrice = selectedUnit ? selectedUnit.price * days : 0;
  const hasOverride = priceOverride && priceOverride.length > 0;
  const finalPrice = hasOverride && Number.isFinite(Number(priceOverride))
    ? Number(priceOverride)
    : computedPrice;

  async function onSubmit(values: CreateValues) {
    try {
      const payload = {
        unit_id: values.unit_id,
        date_from: values.date_from,
        date_to: values.date_to,
        ...(values.price_override && values.price_override.length > 0
          ? { price: Number(values.price_override) }
          : {}),
      };
      await rentsApi.create(payload);
      onSuccess();
    } catch (err) {
      const message = applyApiErrors<CreateValues>(err, setError, [
        'unit_id',
        'date_from',
        'date_to',
        'price_override',
      ]);
      if (message) toast.error(message);
    }
  }

  return (
    <Modal open onClose={onClose} title="Новая аренда" width={620}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        <Field
          label="Кладовка"
          error={errors.unit_id?.message}
          hint="Доступны только свободные кладовки"
        >
          <Select {...register('unit_id', { valueAsNumber: true })}>
            <option value={0}>— Выберите кладовку —</option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.container?.code ?? '—'} / #{u.number} · {u.size} м² · {fmtMoney(u.price)}/день
                {u.container?.location ? ` · ${u.container.location.city}` : ''}
              </option>
            ))}
          </Select>
        </Field>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Дата начала" error={errors.date_from?.message}>
            <Input type="date" min={todayStr} {...register('date_from')} />
          </Field>
          <Field label="Дата окончания" error={errors.date_to?.message} hint={`минимум ${MIN_DAYS} дней`}>
            <Input type="date" {...register('date_to')} />
          </Field>
        </div>

        {/* Live price calculation */}
        <div
          className="card"
          style={{ background: 'var(--bg-muted)', border: '1px solid var(--line)' }}
        >
          <div className="card-body col gap-2">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="t-small muted">Срок</span>
              <span className="mono tnum">
                {days} {pluralize(days, ['день', 'дня', 'дней'])}
              </span>
            </div>
            {selectedUnit && (
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="t-small muted">Цена за день</span>
                <span className="mono tnum">{fmtMoney(selectedUnit.price)}</span>
              </div>
            )}
            <div
              className="row"
              style={{
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid var(--line)',
              }}
            >
              <span className="h-2">Итого</span>
              <span className="serif tnum" style={{ fontSize: 26 }}>
                {fmtMoney(finalPrice)}
              </span>
            </div>
            {hasOverride && (
              <div className="t-small dim">Цена переопределена вручную (по умолчанию рассчитывается).</div>
            )}
          </div>
        </div>

        <Field
          label="Цена (необязательно)"
          error={errors.price_override?.message}
          hint="Оставьте пустым для авторасчёта"
        >
          <Input type="number" step="1" min={0} placeholder="Например, 12000" {...register('price_override')} />
        </Field>

        <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button
            type="submit"
            variant="primary"
            icon="check"
            loading={isSubmitting}
            disabled={!selectedUnit || days < MIN_DAYS}
          >
            Оформить
          </Button>
        </div>
      </form>
    </Modal>
  );
}
