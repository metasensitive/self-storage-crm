import { useMemo, useState } from 'react';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { Drawer, DrawerBody, DrawerFoot, DrawerHead } from '@/components/ui/Drawer';
import { useToast, useToastError } from '@/components/ui/Toast';
import { AddressAutocomplete, type AddressSuggestion } from '@/components/ui/AddressAutocomplete';
import { StatusBadge } from '@/components/StatusBadge';
import { SegmentBar } from '@/components/charts/SegmentBar';
import { Ic } from '@/components/Ic';
import { locationsApi, type LocationPayload } from '@/api/locations';
import { analyticsApi } from '@/api/analytics';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, fmtMoney } from '@/lib/format';
import type { Location, LocationStatus } from '@/api/types';

const schema = z.object({
  name: z.string().min(2, 'Минимум 2 символа').max(255, 'Максимум 255 символов'),
  status: z.enum(['active', 'inactive']),
});

type FormValues = z.infer<typeof schema>;

const STATUS_OPTIONS: Array<{ value: LocationStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
];

export default function LocationsPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<LocationStatus | 'all'>('all');
  const [drawerLocation, setDrawerLocation] = useState<Location | null>(null);
  const [editing, setEditing] = useState<Location | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Location | null>(null);

  const listQ = useQuery({
    queryKey: queryKeys.locations.list({ page }),
    queryFn: () => locationsApi.list({ page }),
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data]);
  const meta = listQ.data?.meta;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((l) => {
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return (
        l.name.toLowerCase().includes(q) ||
        l.city.toLowerCase().includes(q) ||
        l.address.toLowerCase().includes(q)
      );
    });
  }, [items, search, statusFilter]);

  // Аналитика для всех видимых карточек
  const statsQ = useQueries({
    queries: filtered.map((l) => ({
      queryKey: queryKeys.analytics.location(l.id),
      queryFn: () => analyticsApi.location(l.id),
      enabled: filtered.length > 0,
    })),
  });

  const drawerStats = useQuery({
    queryKey: drawerLocation ? queryKeys.analytics.location(drawerLocation.id) : ['noop'],
    queryFn: () => analyticsApi.location(drawerLocation!.id),
    enabled: drawerLocation != null,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => locationsApi.remove(id),
    onSuccess: () => {
      toast.success('Локация удалена');
      setConfirmingDelete(null);
      setDrawerLocation(null);
      invalidate();
    },
    onError: (err) => {
      toastError(err, 'Не удалось удалить локацию');
    },
  });

  return (
    <>
      <Topbar
        crumbs={['Локации']}
        actions={
          isAdmin && (
            <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>
              Новая локация
            </Button>
          )
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Сеть</span>
            <h1 className="h-display">Локации</h1>
            <span className="muted t-body">
              {meta ? `${meta.total} объектов в сети` : 'Все физические точки сети.'}
            </span>
          </div>
        </div>

        <div className="row gap-2 mb-4" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="search" style={{ width: 320 }}>
            <Ic name="search" size={14} />
            <input
              placeholder="Название, город, адрес…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as LocationStatus | 'all')}
            style={{ width: 200 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>

        {listQ.isLoading ? (
          <LoadingState label="Загрузка локаций…" />
        ) : listQ.error ? (
          <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
        ) : filtered.length === 0 ? (
          <Empty
            title={items.length === 0 ? 'Локаций ещё нет' : 'Ничего не найдено'}
            hint={
              items.length === 0
                ? 'Создайте первую локацию, чтобы начать управлять сетью.'
                : 'Попробуйте изменить запрос или фильтр.'
            }
            action={
              isAdmin && items.length === 0 ? (
                <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                  Создать локацию
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 14,
            }}
          >
            {filtered.map((l, i) => {
              const stats = statsQ[i]?.data;
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setDrawerLocation(l)}
                  className="card"
                  style={{
                    textAlign: 'left',
                    padding: 0,
                    cursor: 'pointer',
                    background: 'var(--bg-elev)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div
                    className="card-body col gap-3"
                    style={{ display: 'flex', flexDirection: 'column' }}
                  >
                    <div className="row" style={{ justifyContent: 'space-between' }}>
                      <div className="col">
                        <span className="h-2">{l.name}</span>
                        <span className="t-small mt-1">
                          {l.city} · {l.address}
                        </span>
                      </div>
                      <StatusBadge kind="location" status={l.status} />
                    </div>

                    <div className="row gap-3" style={{ marginTop: 4 }}>
                      <div className="col" style={{ minWidth: 70 }}>
                        <span className="t-micro">Контейнеры</span>
                        <span className="serif tnum" style={{ fontSize: 26, lineHeight: 1.1 }}>
                          {l.containers_count}
                        </span>
                      </div>
                      <div className="col" style={{ minWidth: 70 }}>
                        <span className="t-micro">Кладовки</span>
                        <span className="serif tnum" style={{ fontSize: 26, lineHeight: 1.1 }}>
                          {l.units_count}
                        </span>
                      </div>
                      <div className="col grow">
                        <span className="t-micro">Доход (мес.)</span>
                        <span className="serif tnum" style={{ fontSize: 26, lineHeight: 1.1 }}>
                          {stats ? fmtMoney(stats.monthly_income, { compact: true }) : '—'}
                        </span>
                      </div>
                    </div>

                    <div className="col gap-2">
                      <div className="row" style={{ justifyContent: 'space-between' }}>
                        <span className="t-small muted">Заполняемость</span>
                        <span className="t-small mono tnum">
                          {stats ? `${Math.round(stats.occupancy_percent)}%` : '—'}
                        </span>
                      </div>
                      {stats ? (
                        <SegmentBar
                          free={stats.free_units}
                          rented={stats.rented_units}
                          reserved={stats.reserved_units}
                          blocked={stats.blocked_units}
                        />
                      ) : (
                        <div className="bar" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
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

      {/* Drawer детализации */}
      <Drawer open={drawerLocation != null} onClose={() => setDrawerLocation(null)}>
        {drawerLocation && (
          <>
            <DrawerHead>
              <div className="col gap-2 grow">
                <div className="row gap-2">
                  <span className="t-micro">Локация</span>
                  <StatusBadge kind="location" status={drawerLocation.status} />
                </div>
                <span className="h-display-sm">{drawerLocation.name}</span>
                <span className="muted t-small">
                  {drawerLocation.city} · {drawerLocation.address}
                </span>
              </div>
              <IconButton icon="close" label="Закрыть" onClick={() => setDrawerLocation(null)} />
            </DrawerHead>
            <DrawerBody>
              <div
                className="col gap-4"
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div>
                  <span className="t-micro">Координаты</span>
                  <div className="row gap-3 mt-2">
                    <span className="mono tnum t-body">
                      {drawerLocation.latitude?.toFixed(5) ?? '—'}, {drawerLocation.longitude?.toFixed(5) ?? '—'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="t-micro">Статистика</span>
                  {drawerStats.isLoading ? (
                    <div className="mt-2">
                      <LoadingState inline label="Загрузка статистики…" />
                    </div>
                  ) : drawerStats.data ? (
                    <div
                      className="col gap-3 mt-2"
                      style={{ display: 'flex', flexDirection: 'column' }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(3, 1fr)',
                          gap: 12,
                        }}
                      >
                        <div className="kpi">
                          <div className="label">Заполняемость</div>
                          <div className="value">
                            {Math.round(drawerStats.data.occupancy_percent)}
                            <span className="unit">%</span>
                          </div>
                          <span className="t-small">
                            {drawerStats.data.occupied_units} из {drawerStats.data.total_units}
                          </span>
                        </div>
                        <div className="kpi">
                          <div className="label">Свободно</div>
                          <div className="value">{drawerStats.data.free_units}</div>
                          <span className="t-small">{drawerStats.data.blocked_units} блок.</span>
                        </div>
                        <div className="kpi">
                          <div className="label">Доход (мес.)</div>
                          <div className="value">
                            {fmtMoney(drawerStats.data.monthly_income, { compact: true }).replace(
                              ' ₽',
                              '',
                            )}
                            <span className="unit">₽</span>
                          </div>
                        </div>
                      </div>
                      <SegmentBar
                        free={drawerStats.data.free_units}
                        rented={drawerStats.data.rented_units}
                        reserved={drawerStats.data.reserved_units}
                        blocked={drawerStats.data.blocked_units}
                        height={10}
                      />
                    </div>
                  ) : (
                    <div className="t-small dim mt-2">Нет данных.</div>
                  )}
                </div>

                <div>
                  <span className="t-micro">Создана</span>
                  <div className="t-body mt-1">{fmtDate(drawerLocation.created_at)}</div>
                </div>
              </div>
            </DrawerBody>
            {isAdmin && (
              <DrawerFoot>
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => setConfirmingDelete(drawerLocation)}
                >
                  Удалить
                </Button>
                <div className="grow" />
                <Button icon="edit" onClick={() => setEditing(drawerLocation)}>
                  Редактировать
                </Button>
              </DrawerFoot>
            )}
          </>
        )}
      </Drawer>

      {/* Create modal */}
      {creating && (
        <LocationFormModal
          open
          mode="create"
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success('Локация создана');
            invalidate();
          }}
        />
      )}

      {/* Edit modal */}
      {editing && (
        <LocationFormModal
          open
          mode="edit"
          location={editing}
          onClose={() => setEditing(null)}
          onSuccess={(updated) => {
            setEditing(null);
            setDrawerLocation(updated);
            toast.success('Локация обновлена');
            invalidate();
          }}
        />
      )}

      {/* Confirm delete */}
      <Modal
        open={confirmingDelete != null}
        onClose={() => setConfirmingDelete(null)}
        title="Удалить локацию?"
        width={460}
      >
        <p className="t-body">
          Локация{' '}
          <strong>{confirmingDelete?.name}</strong> будет удалена. Удаление невозможно, если в
          ней есть контейнеры.
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
  location?: Location;
  onClose: () => void;
  onSuccess: (location: Location) => void;
}

function LocationFormModal({ open, mode, location, onClose, onSuccess }: FormModalProps) {
  const toast = useToast();
  const [picked, setPicked] = useState<AddressSuggestion | null>(
    location
      ? {
          id: 'preset',
          displayName: `${location.address}, ${location.city}`,
          city: location.city,
          address: location.address,
          latitude: location.latitude ?? 0,
          longitude: location.longitude ?? 0,
        }
      : null,
  );
  const [addressTouched, setAddressTouched] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: location
      ? { name: location.name, status: location.status }
      : { name: '', status: 'active' },
  });

  async function onSubmit(values: FormValues) {
    setAddressTouched(true);
    if (!picked) return; // адрес обязателен — но валидируем вне Zod
    try {
      const payload: LocationPayload = {
        name: values.name,
        status: values.status,
        city: picked.city,
        address: picked.address,
        latitude: picked.latitude,
        longitude: picked.longitude,
      };
      const saved =
        mode === 'create'
          ? await locationsApi.create(payload)
          : await locationsApi.update(location!.id, payload);
      onSuccess(saved);
    } catch (err) {
      const message = applyApiErrors<FormValues>(err, setError);
      if (message) toast.error(message);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'create' ? 'Новая локация' : 'Редактировать локацию'}
      width={620}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        <Field label="Название" error={errors.name?.message}>
          <Input placeholder="ЖК Маяк" {...register('name')} />
        </Field>

        <Field
          label="Адрес"
          hint="Город и координаты подтянутся автоматически"
          error={addressTouched && !picked ? 'Выберите адрес из подсказок' : undefined}
        >
          <AddressAutocomplete
            value={picked}
            onChange={(s) => {
              setPicked(s);
              setAddressTouched(false);
            }}
            countryCodes={['ru']}
          />
        </Field>

        <Field label="Статус" error={errors.status?.message}>
          <Select {...register('status')}>
            <option value="active">Активна</option>
            <option value="inactive">Неактивна</option>
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

