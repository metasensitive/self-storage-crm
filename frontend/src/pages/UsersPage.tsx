import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Topbar } from '@/components/Topbar';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { ErrorState } from '@/components/ui/ErrorState';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { LoadingState } from '@/components/ui/LoadingState';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useToast, useToastError } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { Ic } from '@/components/Ic';
import { useAuth } from '@/contexts/AuthContext';
import { usersApi, type CreateUserPayload, type UpdateUserPayload } from '@/api/users';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { copyToClipboard, generateTempPassword } from '@/lib/password';
import { fmtDate } from '@/lib/format';
import type { Role, User } from '@/api/types';

/**
 * Эвристика «Ожидает входа»: при создании Laravel выставляет created_at == updated_at.
 * После любой смены пароля или обновления профиля updated_at становится позже.
 * Используется единая логика, что и в AuthContext.detectMustChangePassword.
 */
function isPendingFirstLogin(u: User): boolean {
  if (!u.created_at || !u.updated_at) return false;
  if (u.created_at === u.updated_at) return true;
  const created = Date.parse(u.created_at);
  const updated = Date.parse(u.updated_at);
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return Math.abs(updated - created) < 60_000;
}

const baseSchema = {
  name: z.string().min(1, 'Имя обязательно').max(100, 'Максимум 100 символов'),
  email: z.string().min(1, 'Email обязателен').email('Неверный формат email').max(255, 'Слишком длинный email'),
  role: z.enum(['admin', 'manager']),
};

const createSchema = z.object({
  ...baseSchema,
  password: z.string().min(8, 'Минимум 8 символов').max(32, 'Максимум 32 символа'),
});

const editSchema = z.object({
  ...baseSchema,
  password: z
    .string()
    .optional()
    .refine((v) => !v || (v.length >= 8 && v.length <= 32), {
      message: 'Пароль 8–32 символа',
    }),
});

type CreateValues = z.infer<typeof createSchema>;
type EditValues = z.infer<typeof editSchema>;

export default function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();

  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<User | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<
    { name: string; email: string; password: string } | null
  >(null);

  const listQ = useQuery({
    queryKey: queryKeys.users.list({ page }),
    queryFn: () => usersApi.list({ page }),
  });

  const items = listQ.data?.data ?? [];
  const meta = listQ.data?.meta;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
  };

  const deleteMut = useMutation({
    mutationFn: (id: number) => usersApi.remove(id),
    onSuccess: () => {
      toast.success('Пользователь удалён');
      setConfirmingDelete(null);
      invalidate();
    },
    onError: (err) => toastError(err, 'Не удалось удалить пользователя'),
  });

  return (
    <>
      <Topbar
        crumbs={['Сотрудники']}
        actions={
          <Button variant="primary" size="sm" icon="plus" onClick={() => setCreating(true)}>
            Новый сотрудник
          </Button>
        }
      />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Команда</span>
            <h1 className="h-display">Сотрудники</h1>
            <span className="muted t-body">
              {meta ? `${meta.total} учётных записей` : 'Управление учётными записями.'}
            </span>
          </div>
        </div>

        {listQ.isLoading ? (
          <LoadingState label="Загрузка пользователей…" />
        ) : listQ.error ? (
          <ErrorState error={listQ.error} onRetry={() => void listQ.refetch()} />
        ) : items.length === 0 ? (
          <Empty
            title="Пользователей ещё нет"
            hint="Создайте первый аккаунт сотрудника, чтобы дать ему доступ."
            action={
              <Button variant="primary" icon="plus" onClick={() => setCreating(true)}>
                Создать сотрудника
              </Button>
            }
          />
        ) : (
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>Сотрудник</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Создан</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const isMe = me?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      onClick={() => setEditing(u)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td>
                        <div className="row gap-3">
                          <Avatar name={u.name} src={u.avatar_url} />
                          <div className="col">
                            <span style={{ fontWeight: 500 }}>
                              {u.name}
                              {isMe && (
                                <span className="t-small dim" style={{ marginLeft: 8 }}>
                                  (вы)
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="mono">{u.email}</span>
                      </td>
                      <td>
                        <StatusBadge kind="role" status={u.role} />
                      </td>
                      <td>
                        {isPendingFirstLogin(u) ? (
                          <span className="badge reserved" title="Не входил в систему / не сменил пароль">
                            <span className="dot" />
                            Ожидает входа
                          </span>
                        ) : (
                          <span className="badge active">
                            <span className="dot" />
                            Активен
                          </span>
                        )}
                      </td>
                      <td className="t-small">{fmtDate(u.created_at)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="row gap-1" style={{ justifyContent: 'flex-end' }}>
                          <IconButton
                            icon="edit"
                            label="Редактировать"
                            onClick={() => setEditing(u)}
                          />
                          <IconButton
                            icon="trash"
                            label={isMe ? 'Нельзя удалить себя' : 'Удалить'}
                            disabled={isMe}
                            onClick={() => !isMe && setConfirmingDelete(u)}
                          />
                        </div>
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

      {creating && (
        <CreateUserModal
          onClose={() => setCreating(false)}
          onSuccess={(creds) => {
            setCreating(false);
            invalidate();
            // Показываем «карточку учётки»: email + временный пароль с возможностью копировать
            setCreatedCredentials(creds);
          }}
        />
      )}

      {createdCredentials && (
        <NewUserCredentialsModal
          credentials={createdCredentials}
          onClose={() => setCreatedCredentials(null)}
        />
      )}

      {editing && (
        <EditUserModal
          user={editing}
          isMe={me?.id === editing.id}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            toast.success('Сотрудник обновлён');
            invalidate();
          }}
        />
      )}

      <Modal
        open={confirmingDelete != null}
        onClose={() => setConfirmingDelete(null)}
        title="Удалить сотрудника?"
        width={460}
      >
        <p className="t-body">
          Аккаунт <strong>{confirmingDelete?.name}</strong> ({confirmingDelete?.email}) будет
          удалён. Все его токены доступа будут аннулированы.
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

interface CreateProps {
  onClose: () => void;
  onSuccess: (creds: { name: string; email: string; password: string }) => void;
}

function CreateUserModal({ onClose, onSuccess }: CreateProps) {
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', email: '', password: '', role: 'manager' },
  });

  function fillGenerated() {
    const pw = generateTempPassword();
    setValue('password', pw, { shouldValidate: true, shouldDirty: true });
    setShowPw(true);
  }

  async function onSubmit(values: CreateValues) {
    try {
      const payload: CreateUserPayload = values;
      await usersApi.create(payload);
      onSuccess({ name: values.name, email: values.email, password: values.password });
    } catch (err) {
      const message = applyApiErrors<CreateValues>(err, setError);
      if (message) toast.error(message);
    }
  }

  return (
    <Modal open onClose={onClose} title="Новый сотрудник" width={560}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        <Field label="Имя" error={errors.name?.message}>
          <Input placeholder="Иван Петров" {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" placeholder="user@company.com" {...register('email')} />
        </Field>
        <Field
          label="Временный пароль"
          error={errors.password?.message}
          hint="Сгенерируйте автоматически или задайте вручную (8–32 символа). Сотрудник сменит его при первом входе."
        >
          <div className="row gap-2" style={{ alignItems: 'stretch' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                style={{ paddingRight: 38, fontFamily: 'var(--mono)' }}
                {...register('password')}
              />
              <IconButton
                icon={showPw ? 'eye_off' : 'eye'}
                label={showPw ? 'Скрыть' : 'Показать'}
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                style={{ position: 'absolute', right: 4, top: 4 }}
              />
            </div>
            <Button
              type="button"
              icon="sparkle"
              onClick={fillGenerated}
              title="Сгенерировать временный пароль"
            >
              Сгенерировать
            </Button>
          </div>
        </Field>
        <Field label="Роль" error={errors.role?.message}>
          <Select {...register('role')}>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </Select>
        </Field>

        <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button type="submit" variant="primary" icon="check" loading={isSubmitting}>
            Создать
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface EditProps {
  user: User;
  isMe: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function EditUserModal({ user, isMe, onClose, onSuccess }: EditProps) {
  const toast = useToast();
  const [showPw, setShowPw] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    },
  });

  async function onSubmit(values: EditValues) {
    try {
      const payload: UpdateUserPayload = {
        name: values.name,
        email: values.email,
        // Если редактируем себя — отправляем текущую роль, чтобы бэк не вернул 422
        role: isMe ? (user.role as Role) : values.role,
      };
      if (values.password && values.password.length > 0) {
        payload.password = values.password;
      }
      await usersApi.update(user.id, payload);
      onSuccess();
    } catch (err) {
      const message = applyApiErrors<EditValues>(err, setError);
      if (message) toast.error(message);
    }
  }

  return (
    <Modal open onClose={onClose} title={`Редактировать: ${user.name}`} width={560}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
        {isMe && (
          <div
            className="t-small"
            style={{
              padding: '8px 12px',
              border: '1px dashed var(--line-2)',
              borderRadius: 'var(--r-md)',
              color: 'var(--ink-3)',
            }}
          >
            Это ваш аккаунт. Роль изменить нельзя — для смены пароля используйте раздел
            «Профиль».
          </div>
        )}
        <Field label="Имя" error={errors.name?.message}>
          <Input {...register('name')} />
        </Field>
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" {...register('email')} />
        </Field>
        <Field label="Роль" error={errors.role?.message}>
          <Select disabled={isMe} {...register('role')}>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </Select>
        </Field>
        <Field
          label="Новый пароль"
          error={errors.password?.message}
          hint="Оставьте пустым, чтобы не менять. При смене все токены пользователя сбросятся."
        >
          <div style={{ position: 'relative' }}>
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              style={{ paddingRight: 38 }}
              {...register('password')}
            />
            <IconButton
              icon={showPw ? 'eye_off' : 'eye'}
              label={showPw ? 'Скрыть' : 'Показать'}
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              style={{ position: 'absolute', right: 4, top: 4 }}
            />
          </div>
        </Field>

        <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={onClose} type="button">
            Отмена
          </Button>
          <Button type="submit" variant="primary" icon="check" loading={isSubmitting}>
            Сохранить
          </Button>
        </div>
      </form>
    </Modal>
  );
}

interface CredentialsProps {
  credentials: { name: string; email: string; password: string };
  onClose: () => void;
}

function NewUserCredentialsModal({ credentials, onClose }: CredentialsProps) {
  const toast = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function copy(field: string, value: string) {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedField(field);
      toast.success('Скопировано в буфер');
      window.setTimeout(() => setCopiedField((c) => (c === field ? null : c)), 1800);
    } else {
      toast.error('Не удалось скопировать');
    }
  }

  const both = `Email: ${credentials.email}\nПароль: ${credentials.password}`;

  return (
    <Modal open onClose={onClose} title="Сотрудник создан" width={520}>
      <p className="t-body">
        Аккаунт <strong>{credentials.name}</strong> готов. Передайте сотруднику его учётные данные —
        при первом входе он установит свой постоянный пароль.
      </p>

      <div
        className="col gap-3 mt-4"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          background: 'var(--bg-muted)',
          border: '1px solid var(--line)',
          borderRadius: 'var(--r-md)',
        }}
      >
        <CredentialRow
          label="Email"
          value={credentials.email}
          copied={copiedField === 'email'}
          onCopy={() => copy('email', credentials.email)}
        />
        <CredentialRow
          label="Временный пароль"
          value={credentials.password}
          mono
          copied={copiedField === 'password'}
          onCopy={() => copy('password', credentials.password)}
        />
      </div>

      <div
        className="row gap-2 t-small mt-4"
        style={{
          padding: '10px 14px',
          border: '1px dashed var(--line-2)',
          borderRadius: 'var(--r-md)',
          color: 'var(--ink-2)',
          alignItems: 'flex-start',
        }}
      >
        <Ic name="info" size={14} />
        <span>
          Этот пароль больше не будет показан. Скопируйте его сейчас — после закрытия окна получить
          его снова можно будет только через сброс.
        </span>
      </div>

      <div
        className="row gap-2 mt-4"
        style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}
      >
        <Button icon="download" onClick={() => copy('both', both)}>
          Скопировать всё
        </Button>
        <Button variant="primary" icon="check" onClick={onClose}>
          Понятно
        </Button>
      </div>
    </Modal>
  );
}

interface CredentialRowProps {
  label: string;
  value: string;
  copied: boolean;
  mono?: boolean;
  onCopy: () => void;
}

function CredentialRow({ label, value, copied, mono, onCopy }: CredentialRowProps) {
  return (
    <div className="col gap-1" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span className="t-micro">{label}</span>
      <div className="row gap-2" style={{ alignItems: 'center' }}>
        <code
          style={{
            flex: 1,
            padding: '8px 12px',
            background: 'var(--bg-elev)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--r-sm)',
            fontFamily: mono ? 'var(--mono)' : 'inherit',
            fontSize: 14,
            wordBreak: 'break-all',
            userSelect: 'all',
          }}
        >
          {value}
        </code>
        <Button
          size="sm"
          icon={copied ? 'check' : 'download'}
          onClick={onCopy}
          variant={copied ? 'primary' : 'default'}
        >
          {copied ? 'Скопировано' : 'Копировать'}
        </Button>
      </div>
    </div>
  );
}
