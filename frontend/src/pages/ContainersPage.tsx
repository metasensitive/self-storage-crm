import { useMemo, useState } from 'react';
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
import { Drawer, DrawerBody, DrawerFoot, DrawerHead } from '@/components/ui/Drawer';
import { useToast, useToastError } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { Ic } from '@/components/Ic';
import { containersApi, type ContainerPayload } from '@/api/containers';
import { locationsApi } from '@/api/locations';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { useAuth } from '@/contexts/AuthContext';
import { fmtDate, fmtDateShort } from '@/lib/format';
import { fetchAllPages, type CsvColumn } from '@/lib/export';
import { ExportButton } from '@/components/ExportButton';
import type { Container, ContainerStatus } from '@/api/types';

const STATUS_OPTIONS: Array<{ value: ContainerStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Все статусы' },
  { value: 'active', label: 'Активные' },
  { value: 'inactive', label: 'Неактивные' },
  { value: 'maintenance', label: 'На обслуживании' },
];

const STATUS_VALUES: ContainerStatus[] = ['active', 'inactive', 'maintenance'];

const STATUS_LABEL: Record<ContainerStatus, string> = {
  active: 'Активен',
  inactive: 'Неактивен',
  maintenance: 'Обслуживание',
};

const CONTAINERS_CSV_COLUMNS: ReadonlyArray<CsvColumn<Container>> = [
  { header: 'ID', cell: (c) => c.id },
  { header: 'Код', cell: (c) => c.code },
  { header: 'Локация', cell: (c) => c.location?.name ?? '' },
  { header: 'Город', cell: (c) => c.location?.city ?? '' },
  { header: 'Кладовки', cell: (c) => c.units_count },
  { header: 'Статус', cell: (c) => STATUS_LABEL[c.status] ?? c.status },
  { header: 'Установлен', cell: (c) => c.installed_at ?? '' },
  { header: 'Создан', cell: (c) => c.created_at },
];

const schema = z.object({
  location_id: z
    .number({ invalid_type_error: 'Выберите локацию' })
    .int()
    .positive('Выберите локацию'),
  // Для создания — поле скрыто и бэк генерирует код. Для редактирования —
  // показывается и должно быть непустым.
  code: z.string().max(50, 'Максимум 50 символов').optional(),
  status: z.enum(['active', 'inactive', 'maintenance']),
  installed_at: z
    .string()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

type FormValues = z.infer<typeof schema>;

export default function ContainersPage() {
  const { role } = useAuth();
  const isAdmin = role === 'admin';
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContainerStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<number | 'all'>('all');
  const [drawerContainer, setDrawerContainer] = useState<Container | null>(null);
  const [editing, setEditing] = useState<Container | null>(null);
  const [creating, setCreating] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<Container | null>(null);

  const params = useMemo(
    () => ({
      page,
      ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
      ...(locationFilter !== 'all' ? { location_id: locationFilter } : {}),
    }),
    [page, statusFilter, locationFilter],
  );

  const listQ = useQuery({
    queryKey: queryKeys.containers.list(params),
    queryFn: () => containersApi.list(params),
  });

  const locationsListQ = useQuery({
    queryKey: queryKeys.locations.list({ all: true }),
    queryFn: () => locationsApi.list({ page: 1 }),
  });

  const items = useMemo(() => listQ.data?.data ?? [], [listQ.data]);
  const meta = listQ.data?.meta;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) => c.code.toLowerCase().includes(q));
  }, [items, search]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.containers.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.locations.all });
    void queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => containersApi.remove(id),
    onSuccess: () => {
      toast.success('Контейнер удалён');
      setConfirmingDelete(null);
      setDrawerContainer(null);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось удалить контейнер'),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContainerStatus }) =>
      containersApi.updateStatus(id, status),
    onSuccess: (updated) => {
      toast.success(`Статус: ${STATUS_LABEL[updated.status]}`);
      setDrawerContainer(updated);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось сменить статус'),
  });

  return (
    <>
      <Topbar
        crumbs={['Контейнеры']}
        actions={
          <>
            <ExportButton<Container>
              filename="containers"
              columns={CONTAINERS_CSV_COLUMNS}
              // Уважаем активные фильтры — экспортируем то же, что видно в таблице
              fetchRows={() =>
                fetchAllPages((page) =>
                  containersApi.list({
                    page,
                    ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
                    ...(locationFilter !== 'all'
                      ? { location_id: locationFilter as number }
                      : {}),
                  }),
                )
              }
            />
            {isAdmin && (
              <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>
                Новый контейнер
              </Button>
            )}
          </>
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Инфраструктура</span>
            <h1 className="h-display">Контейнеры</h1>
            <span className="muted t-body">
              {meta ? `${meta.total} контейнеров в сети` : 'Установка и обслуживание модулей.'}
            </span>
          </div>
        </div>

        <div className="row gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="search" style={{ width: 280 }}>
            <Ic name="search" size={14} />
            <input
              placeholder="Код контейнера…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={String(locationFilter)}
            onChange={(e) => {
              setPage(1);
              setLocationFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
            }}
            style={{ width: 240 }}
          >
            <option value="all">Все локации</option>
            {locationsListQ.data?.data.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.city}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setPage(1);
              setStatusFilter(e.target.value as ContainerStatus | 'all');
            }}
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
          <LoadingState label="Загрузка контейнеров…" />
        ) : listQ.error ? (
          <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
        ) : filtered.length === 0 ? (
          <Empty
            title={items.length === 0 ? 'Контейнеров пока нет' : 'Ничего не найдено'}
            hint={
              items.length === 0
                ? 'Добавьте первый контейнер, чтобы начать управлять кладовками.'
                : 'Попробуйте изменить фильтры или поиск.'
            }
            action={
              isAdmin && items.length === 0 ? (
                <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                  Создать контейнер
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Локация</th>
                  <th style={{ textAlign: 'center' }}>Кладовки</th>
                  <th>Статус</th>
                  <th>Установлен</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} onClick={() => setDrawerContainer(c)}>
                    <td>
                      <span className="mono" style={{ fontWeight: 500 }}>
                        {c.code}
                      </span>
                    </td>
                    <td>
                      {c.location ? (
                        <div className="col">
                          <span style={{ fontWeight: 500 }}>{c.location.name}</span>
                          <span className="t-small">{c.location.city}</span>
                        </div>
                      ) : (
                        <span className="dim">—</span>
                      )}
                    </td>
                    <td className="tnum" style={{ textAlign: 'center' }}>
                      {c.units_count}
                    </td>
                    <td>
                      <StatusBadge kind="container" status={c.status} />
                    </td>
                    <td className="t-small">
                      {c.installed_at ? fmtDateShort(c.installed_at) : '—'}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        icon="chev_r"
                        label="Открыть"
                        onClick={() => setDrawerContainer(c)}
                      />
                    </td>
                  </tr>
                ))}
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
      <Drawer open={drawerContainer != null} onClose={() => setDrawerContainer(null)}>
        {drawerContainer && (
          <>
            <DrawerHead>
              <div className="col gap-2 grow">
                <div className="row gap-2">
                  <span className="t-micro">Контейнер</span>
                  <StatusBadge kind="container" status={drawerContainer.status} />
                </div>
                <span className="h-display-sm mono">{drawerContainer.code}</span>
                {drawerContainer.location && (
                  <span className="muted t-small">
                    {drawerContainer.location.name} · {drawerContainer.location.city}
                  </span>
                )}
              </div>
              <IconButton
                icon="close"
                label="Закрыть"
                onClick={() => setDrawerContainer(null)}
              />
            </DrawerHead>
            <DrawerBody>
              <div
                className="col"
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                <div
                  style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
                >
                  <div className="kpi">
                    <div className="label">Кладовок</div>
                    <div className="value">{drawerContainer.units_count}</div>
                  </div>
                  <div className="kpi">
                    <div className="label">Установлен</div>
                    <div className="value" style={{ fontSize: 18 }}>
                      {drawerContainer.installed_at
                        ? fmtDateShort(drawerContainer.installed_at)
                        : '—'}
                    </div>
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
                          variant={drawerContainer.status === s ? 'primary' : 'default'}
                          loading={statusMut.isPending && statusMut.variables?.status === s}
                          disabled={drawerContainer.status === s}
                          onClick={() =>
                            statusMut.mutate({ id: drawerContainer.id, status: s })
                          }
                        >
                          {STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className="t-micro">Создан</span>
                  <div className="t-body mt-1">{fmtDate(drawerContainer.created_at)}</div>
                </div>
              </div>
            </DrawerBody>
            {isAdmin && (
              <DrawerFoot>
                <Button
                  variant="danger"
                  icon="trash"
                  onClick={() => setConfirmingDelete(drawerContainer)}
                >
                  Удалить
                </Button>
                <div className="grow" />
                <Button icon="edit" onClick={() => setEditing(drawerContainer)}>
                  Редактировать
                </Button>
              </DrawerFoot>
            )}
          </>
        )}
      </Drawer>

      {/* Create / Edit modal */}
      {creating && (
        <ContainerFormModal
          open
          mode="create"
          locations={locationsListQ.data?.data ?? []}
          onClose={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            toast.success('Контейнер создан');
            invalidate();
          }}
        />
      )}

      {editing && (
        <ContainerFormModal
          open
          mode="edit"
          container={editing}
          locations={locationsListQ.data?.data ?? []}
          onClose={() => setEditing(null)}
          onSuccess={(updated) => {
            setEditing(null);
            setDrawerContainer(updated);
            toast.success('Контейнер обновлён');
            invalidate();
          }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        open={confirmingDelete != null}
        onClose={() => setConfirmingDelete(null)}
        title="Удалить контейнер?"
        width={460}
      >
        <p className="t-body">
          Контейнер <strong className="mono">{confirmingDelete?.code}</strong> будет удалён.
          Удаление невозможно, если в нём есть кладовки.
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
  container?: Container;
  locations: Array<{ id: number; name: string; city: string }>;
  onClose: () => void;
  onSuccess: (container: Container) => void;
}

function ContainerFormModal({
  open,
  mode,
  container,
  locations,
  onClose,
  onSuccess,
}: FormModalProps) {
  const toast = useToast();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: container
      ? {
          location_id: container.location?.id ?? 0,
          code: container.code,
          status: container.status,
          installed_at: container.installed_at
            ? container.installed_at.slice(0, 10)
            : undefined,
        }
      : {
          location_id: 0,
          code: undefined,
          status: 'active',
          installed_at: undefined,
        },
  });

  async function onSubmit(values: FormValues) {
    try {
      // units_count — обязательное поле бэка; для пользователя оно нерелевантно
      // (реальное число кладовок считается из их фактического количества).
      // При создании отправляем 1, при редактировании сохраняем существующее значение.
      const payload: ContainerPayload = {
        location_id: values.location_id,
        units_count: container?.units_count ?? 1,
        status: values.status,
        installed_at: values.installed_at ?? null,
      };
      // Код передаём только в режиме редактирования. При создании бэкенд
      // сгенерирует следующий свободный «C-NNN».
      if (mode === 'edit' && values.code) {
        payload.code = values.code;
      }
      const saved =
        mode === 'create'
          ? await containersApi.create(payload)
          : await containersApi.update(container!.id, payload);
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
      title={mode === 'create' ? 'Новый контейнер' : 'Редактировать контейнер'}
      width={560}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        <Field label="Локация" error={errors.location_id?.message}>
          <Select {...register('location_id', { valueAsNumber: true })}>
            <option value={0}>— Выберите локацию —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name} · {l.city}
              </option>
            ))}
          </Select>
        </Field>
        {mode === 'edit' ? (
          <Field label="Код" error={errors.code?.message} hint="Уникальный идентификатор">
            <Input placeholder="C-001" {...register('code')} />
          </Field>
        ) : (
          <div
            className="t-small"
            style={{
              padding: '8px 12px',
              border: '1px dashed var(--line-2)',
              borderRadius: 'var(--r-md)',
              color: 'var(--ink-3)',
            }}
          >
            Код контейнера будет сгенерирован автоматически в формате «C-NNN».
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Статус" error={errors.status?.message}>
            <Select {...register('status')}>
              <option value="active">Активен</option>
              <option value="inactive">Неактивен</option>
              <option value="maintenance">На обслуживании</option>
            </Select>
          </Field>
          <Field label="Дата установки" error={errors.installed_at?.message}>
            <Input type="date" {...register('installed_at')} />
          </Field>
        </div>

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
