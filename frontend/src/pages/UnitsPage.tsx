import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Topbar } from '@/components/Topbar';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { Drawer, DrawerBody, DrawerFoot, DrawerHead } from '@/components/ui/Drawer';
import { useToast, useToastError } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { Ic } from '@/components/Ic';
import { unitsApi, type CreateUnitPayload, type UpdateUnitPayload } from '@/api/units';
import { containersApi } from '@/api/containers';
import { rentsApi } from '@/api/rents';
import { queryKeys } from '@/lib/queryKeys';
import { useOpenParam } from '@/lib/useOpenParam';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, fmtMoney } from '@/lib/format';
import { fetchAllPages, type CsvColumn } from '@/lib/export';
import { ExportButton } from '@/components/ExportButton';
import type { Unit, UnitStatus } from '@/api/types';

const STATUS_OPTIONS: Array<{ value: UnitStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'free', label: 'Свободные' },
  { value: 'reserved', label: 'В резерве' },
  { value: 'rented', label: 'Сдано' },
  { value: 'blocked', label: 'Заблокированы' },
];

const STATUS_VALUES: UnitStatus[] = ['free', 'reserved', 'rented', 'blocked'];

const STATUS_LABEL: Record<UnitStatus, string> = {
  free: 'Свободна',
  reserved: 'Резерв',
  rented: 'Арендована',
  blocked: 'Заблокирована',
};

const UNITS_CSV_COLUMNS: ReadonlyArray<CsvColumn<Unit>> = [
  { header: 'ID', cell: (u) => u.id },
  { header: 'Номер', cell: (u) => u.number },
  { header: 'Контейнер', cell: (u) => u.container?.code ?? '' },
  { header: 'Локация', cell: (u) => u.container?.location?.name ?? '' },
  { header: 'Город', cell: (u) => u.container?.location?.city ?? '' },
  { header: 'Размер, м²', cell: (u) => u.size },
  { header: 'Цена / день', cell: (u) => u.price },
  { header: 'Статус', cell: (u) => STATUS_LABEL[u.status] ?? u.status },
  { header: 'Активных аренд', cell: (u) => u.active_rents_count },
  { header: 'Создана', cell: (u) => u.created_at },
];

const createSchema = z.object({
  container_id: z
    .number({ invalid_type_error: 'Выберите контейнер' })
    .int()
    .positive('Выберите контейнер'),
  number: z
    .number({ invalid_type_error: 'Введите номер' })
    .int('Целое число')
    .min(1, 'Минимум 1'),
  size: z
    .number({ invalid_type_error: 'Введите число' })
    .min(0.5, 'Минимум 0.5 м²')
    .max(999.99, 'Максимум 999.99 м²'),
  price: z
    .number({ invalid_type_error: 'Введите число' })
    .min(0, 'Не может быть отрицательной')
    .max(99_999_999.99, 'Слишком большая цена'),
  status: z.enum(['free', 'reserved', 'rented', 'blocked']),
});

type CreateValues = z.infer<typeof createSchema>;

export default function UnitsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'table' | 'grid'>('table');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<UnitStatus | 'all'>('all');
  const [containerFilter, setContainerFilter] = useState<number | 'all'>('all');
  const [drawerUnit, setDrawerUnit] = useState<Unit | null>(null);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Unit | null>(null);
  const [editingPrice, setEditingPrice] = useState<Unit | null>(null);

  const containersListQ = useQuery({
    queryKey: queryKeys.containers.list({ all: true }),
    queryFn: () => containersApi.list({ page: 1 }),
  });

  // В grid-режиме контейнер обязателен
  const effectiveContainer = mode === 'grid' ? containerFilter : containerFilter;

  const params = useMemo(
    () => ({
      page,
      ...(statusFilter !== 'all' && mode === 'table' ? { status: statusFilter } : {}),
      ...(effectiveContainer !== 'all' ? { container_id: effectiveContainer as number } : {}),
    }),
    [page, statusFilter, effectiveContainer, mode],
  );

  const listQ = useQuery({
    queryKey: queryKeys.units.list(params),
    queryFn: () => unitsApi.list(params),
    enabled: mode === 'table' || (mode === 'grid' && containerFilter !== 'all'),
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data]);
  const meta = listQ.data?.meta;

  const filtered = useMemo(() => {
    const q = search.trim();
    if (!q) return items;
    return items.filter((u) => String(u.number).includes(q));
  }, [items, search]);

  const drawerRentsQ = useQuery({
    queryKey: drawerUnit
      ? queryKeys.rents.list({ unit_id: drawerUnit.id })
      : ['noop'],
    queryFn: () => rentsApi.list({ unit_id: drawerUnit!.id }),
    enabled: drawerUnit != null,
  });

  // Deep link: /units?open={id}
  useOpenParam<Unit>({
    queryKey: queryKeys.units.detail,
    fetch: unitsApi.show,
    onOpen: setDrawerUnit,
    alreadyOpen: !!drawerUnit,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.units.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.containers.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => unitsApi.remove(id),
    onSuccess: () => {
      toast.success('Кладовка удалена');
      setConfirmingDelete(null);
      setDrawerUnit(null);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось удалить кладовку'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: UnitStatus }) =>
      unitsApi.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success(`Статус: ${STATUS_LABEL[updated.status]}`);
      setDrawerUnit(updated);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось сменить статус'),
  });

  const priceMut = useMutation({
    mutationFn: ({ id, price }: { id: number; price: number }) =>
      unitsApi.updatePrice(id, price),
    onSuccess: (updated) => {
      toast.success('Цена обновлена');
      setEditingPrice(null);
      setDrawerUnit(updated);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось изменить цену'),
  });

  const containerOptions = containersListQ.data?.data ?? [];
  const selectedContainer =
    containerFilter !== 'all' ? containerOptions.find((c) => c.id === containerFilter) : undefined;

  return (
    <>
      <Topbar
        crumbs={['Кладовки']}
        actions={
          <>
            <ExportButton<Unit>
              filename="units"
              columns={UNITS_CSV_COLUMNS}
              fetchRows={() =>
                fetchAllPages((page) =>
                  unitsApi.list({
                    page,
                    ...(statusFilter !== 'all' && mode === 'table'
                      ? { status: statusFilter }
                      : {}),
                    ...(containerFilter !== 'all'
                      ? { container_id: containerFilter as number }
                      : {}),
                  }),
                )
              }
            />
            {isAdmin && (
              <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>
                Новая кладовка
              </Button>
            )}
          </>
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Кладовки</span>
            <h1 className="h-display">Управление ячейками</h1>
            <span className="muted t-body">
              {mode === 'table'
                ? meta
                  ? `${meta.total} кладовок в сети`
                  : 'Список всех ячеек хранения.'
                : 'Карта-сетка выбранного контейнера.'}
            </span>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <Tabs
            tabs={[
              { id: 'table', label: 'Таблица' },
              { id: 'grid', label: 'Карта контейнера' },
            ]}
            value={mode}
            onChange={(id) => setMode(id)}
          />
        </div>

        <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          {mode === 'table' && (
            <div className="search" style={{ width: 220 }}>
              <Ic name="search" size={14} />
              <input
                placeholder="Номер кладовки…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}
          <Select
            value={String(containerFilter)}
            onChange={(e) => {
              setPage(1);
              setContainerFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
            }}
            style={{ width: 280 }}
          >
            <option value="all">{mode === 'grid' ? '— Выберите контейнер —' : 'Все контейнеры'}</option>
            {containerOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
                {c.location ? ` · ${c.location.name}` : ''}
              </option>
            ))}
          </Select>
          {mode === 'table' && (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as UnitStatus | 'all');
              }}
              style={{ width: 200 }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          )}
        </div>

        {mode === 'grid' && containerFilter === 'all' ? (
          <Empty
            title="Выберите контейнер"
            hint="Карта-сетка показывает все кладовки выбранного контейнера с цветовой индикацией."
          />
        ) : listQ.isLoading ? (
          <LoadingState label="Загрузка кладовок…" />
        ) : listQ.error ? (
          <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
        ) : filtered.length === 0 ? (
          <Empty
            title={items.length === 0 ? 'Кладовок ещё нет' : 'Ничего не найдено'}
            hint={
              items.length === 0
                ? 'Создайте первую кладовку в одном из контейнеров.'
                : 'Попробуйте изменить фильтры или поиск.'
            }
            action={
              isAdmin && items.length === 0 ? (
                <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                  Создать кладовку
                </Button>
              ) : undefined
            }
          />
        ) : mode === 'grid' ? (
          <div className="card">
            <div className="card-head">
              <div className="col">
                <span className="t-micro">
                  {selectedContainer?.code}
                  {selectedContainer?.location ? ` · ${selectedContainer.location.name}` : ''}
                </span>
                <span className="h-2 mt-1">{filtered.length} кладовок</span>
              </div>
              <div className="row gap-3 t-small">
                <span className="row gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--st-free)' }} />
                  Свободно
                </span>
                <span className="row gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--st-reserved)' }} />
                  Резерв
                </span>
                <span className="row gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--st-rented)' }} />
                  Арендовано
                </span>
                <span className="row gap-2">
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--st-blocked)' }} />
                  Блок
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="units-grid">
                {[...filtered]
                  .sort((a, b) => a.number - b.number)
                  .map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`unit-tile ${u.status}`}
                      onClick={() => setDrawerUnit(u)}
                      title={`#${u.number} · ${u.size} м² · ${fmtMoney(u.price)}`}
                    >
                      <span className="num">#{u.number}</span>
                      <span className="sz">{u.size} м²</span>
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>№</th>
                  <th>Контейнер</th>
                  <th>Локация</th>
                  <th className="num">Размер</th>
                  <th className="num">Цена</th>
                  <th>Статус</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const loc = u.container?.location;
                  const code = u.container?.code;
                  return (
                    <tr key={u.id} onClick={() => setDrawerUnit(u)}>
                      <td className="mono">#{u.number}</td>
                      <td>
                        <span className="mono">{code ?? '—'}</span>
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
                      <td className="num tnum">{u.size} м²</td>
                      <td className="num tnum">{fmtMoney(u.price)}</td>
                      <td>
                        <StatusBadge kind="unit" status={u.status} />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <IconButton icon="chev_r" label="Открыть" onClick={() => setDrawerUnit(u)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && meta.last_page > 1 && mode === 'table' && (
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
      <Drawer open={drawerUnit != null} onClose={() => setDrawerUnit(null)} width={680}>
        {drawerUnit && (
          <>
            <DrawerHead>
              <div className="col gap-2 grow">
                <div className="row gap-2">
                  <span className="t-micro">Кладовка</span>
                  <StatusBadge kind="unit" status={drawerUnit.status} />
                </div>
                <span className="h-display-sm mono">#{drawerUnit.number}</span>
                {drawerUnit.container?.code && (
                  <span className="muted t-small">
                    {drawerUnit.container.code}
                    {drawerUnit.container.location
                      ? ` · ${drawerUnit.container.location.name}, ${drawerUnit.container.location.city}`
                      : ''}
                  </span>
                )}
              </div>
              <IconButton icon="close" label="Закрыть" onClick={() => setDrawerUnit(null)} />
            </DrawerHead>
            <DrawerBody>
              <div
                className="col"
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}
                >
                  <div className="kpi">
                    <div className="label">Размер</div>
                    <div className="value">
                      {drawerUnit.size}
                      <span className="unit">м²</span>
                    </div>
                  </div>
                  <div className="kpi">
                    <div className="label">Цена / день</div>
                    <div className="value">
                      {fmtMoney(drawerUnit.price, { compact: true }).replace(' ₽', '')}
                      <span className="unit">₽</span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        className="t-small"
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          color: 'var(--ink-2)',
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                        onClick={() => setEditingPrice(drawerUnit)}
                      >
                        Изменить цену
                      </button>
                    )}
                  </div>
                  <div className="kpi">
                    <div className="label">Активные аренды</div>
                    <div className="value">{drawerUnit.active_rents_count}</div>
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <span className="t-micro">Сменить статус</span>
                    <div className="row gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                      {STATUS_VALUES.map((s) => (
                        <Button
                          key={s}
                          size="sm"
                          variant={drawerUnit.status === s ? 'primary' : 'default'}
                          loading={statusMut.isPending && statusMut.variables?.status === s}
                          disabled={drawerUnit.status === s}
                          onClick={() => statusMut.mutate({ id: drawerUnit.id, status: s })}
                        >
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="t-micro">История аренд</span>
                    {drawerUnit.status === 'free' && (
                      <Button
                        size="sm"
                        variant="primary"
                        icon="plus"
                        onClick={() =>
                          navigate('/rents', {
                            state: { openCreate: true, unitId: drawerUnit.id },
                          })
                        }
                      >
                        Оформить аренду
                      </Button>
                    )}
                  </div>
                  {drawerRentsQ.isLoading ? (
                    <div className="mt-2">
                      <LoadingState inline label="Загрузка истории…" />
                    </div>
                  ) : drawerRentsQ.data && drawerRentsQ.data.data.length > 0 ? (
                    <div className="mt-2" style={{ borderTop: '1px solid var(--line)' }}>
                      {drawerRentsQ.data.data.map((r) => (
                        <div
                          key={r.id}
                          className="row"
                          style={{
                            padding: '12px 0',
                            borderBottom: '1px solid var(--line)',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <div className="col">
                            <div className="row gap-2">
                              <StatusBadge kind="rent" status={r.status} />
                              <span className="t-small mono">
                                {r.date_from} → {r.date_to}
                              </span>
                            </div>
                            <span className="t-small dim mt-1">
                              Создана {fmtDate(r.created_at)}
                            </span>
                          </div>
                          <span className="mono tnum t-body">{fmtMoney(r.price)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="t-small dim mt-2">Эта кладовка ещё не сдавалась.</div>
                  )}
                </div>

                <div>
                  <span className="t-micro">Создана</span>
                  <div className="t-body mt-1">{fmtDate(drawerUnit.created_at)}</div>
                </div>
              </div>
            </DrawerBody>
            {isAdmin && (
              <DrawerFoot>
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => setConfirmingDelete(drawerUnit)}
                >
                  Удалить
                </Button>
                <div className="grow" />
                <Button icon="edit" onClick={() => setEditing(drawerUnit)}>
                  Редактировать
                </Button>
              </DrawerFoot>
            )}
          </>
        )}
      </Drawer>

      {creating && (
        <UnitFormModal
          open
          mode="create"
          containers={containerOptions}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success('Кладовка создана');
            invalidate();
          }}
        />
      )}

      {editing && (
        <UnitFormModal
          open
          mode="edit"
          unit={editing}
          containers={containerOptions}
          onClose={() => setEditing(null)}
          onSuccess={(updated) => {
            setEditing(null);
            setDrawerUnit(updated);
            toast.success('Кладовка обновлена');
            invalidate();
          }}
        />
      )}

      {editingPrice && (
        <PriceEditModal
          unit={editingPrice}
          loading={priceMut.isPending}
          onClose={() => setEditingPrice(null)}
          onSubmit={(price) => priceMut.mutate({ id: editingPrice.id, price })}
        />
      )}

      <Modal
        open={confirmingDelete != null}
        onClose={() => setConfirmingDelete(null)}
        title="Удалить кладовку?"
        width={460}
      >
        <p className="t-body">
          Кладовка <strong>#{confirmingDelete?.number}</strong> будет удалена. Удаление
          невозможно, если у неё есть активная аренда.
        </p>
        <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmingDelete(null)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            icon="trash"
            loading={deleteMut.isPending}
            onClick={() => confirmingDelete && deleteMut.mutate(confirmingDelete.id)}
          >
            Удалить
          </Button>
        </div>
      </Modal>
    </>
  );
}

interface FormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  unit?: Unit;
  containers: Array<{ id: number; code: string; location?: { name: string; city: string } }>;
  onClose: () => void;
  onSuccess: (unit: Unit) => void;
}

function UnitFormModal({ open, mode, unit, containers, onClose, onSuccess }: FormModalProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: unit
      ? {
          container_id: unit.container?.id ?? 0,
          number: unit.number,
          size: unit.size,
          price: unit.price,
          status: unit.status,
        }
      : {
          container_id: 0,
          number: 1,
          size: 2,
          price: 100,
          status: 'free',
        },
  });

  async function onSubmit(values: CreateValues) {
    try {
      if (mode === 'create') {
        const payload: CreateUnitPayload = {
          container_id: values.container_id,
          number: values.number,
          size: values.size,
          price: values.price,
          status: values.status,
        };
        const saved = await unitsApi.create(payload);
        onSuccess(saved);
      } else {
        const payload: UpdateUnitPayload = {
          number: values.number,
          size: values.size,
          price: values.price,
          status: values.status,
        };
        const saved = await unitsApi.update(unit!.id, payload);
        onSuccess(saved);
      }
    } catch (err) {
      const message = applyApiErrors<CreateValues>(err, setError);
      if (message) toast.error(message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Новая кладовка' : 'Редактировать кладовку'}
      width={560}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        {mode === 'create' && (
          <Field label="Контейнер" error={errors.container_id?.message}>
            <Select {...register('container_id', { valueAsNumber: true })}>
              <option value={0}>— Выберите контейнер —</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code}
                  {c.location ? ` · ${c.location.name}` : ''}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <Field label="Номер" error={errors.number?.message}>
            <Input
              type="number"
              min={1}
              {...register('number', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Размер, м²" error={errors.size?.message}>
            <Input
              type="number"
              step="0.01"
              min={0.5}
              max={999.99}
              {...register('size', { valueAsNumber: true })}
            />
          </Field>
          <Field label="Цена, ₽/день" error={errors.price?.message}>
            <Input
              type="number"
              step="1"
              min={0}
              {...register('price', { valueAsNumber: true })}
            />
          </Field>
        </div>
        <Field label="Статус" error={errors.status?.message}>
          <Select {...register('status')}>
            <option value="free">Свободна</option>
            <option value="reserved">Резерв</option>
            <option value="rented">Арендована</option>
            <option value="blocked">Заблокирована</option>
          </Select>
        </Field>

        <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button type="submit" variant="primary" icon="check" loading={isSubmitting}>
            {mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface PriceEditProps {
  unit: Unit;
  loading: boolean;
  onClose: () => void;
  onSubmit: (price: number) => void;
}

function PriceEditModal({ unit, loading, onClose, onSubmit }: PriceEditProps) {
  const [value, setValue] = useState(String(unit.price));
  const num = Number(value);
  const valid = Number.isFinite(num) && num >= 0 && num <= 99_999_999.99;

  return (
    <Modal open onClose={onClose} title={`Цена кладовки #${unit.number}`} width={420}>
      <Field label="Цена, ₽/день" hint="От 0 до 99 999 999.99">
        <Input
          type="number"
          step="1"
          min={0}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </Field>
      <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
        <Button variant="ghost" onClick={onClose}>
          Отмена
        </Button>
        <Button
          variant="primary"
          icon="check"
          loading={loading}
          disabled={!valid}
          onClick={() => onSubmit(num)}
        >
          Сохранить
        </Button>
      </div>
    </Modal>
  );
}
