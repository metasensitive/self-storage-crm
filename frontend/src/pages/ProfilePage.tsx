import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Topbar } from '@/components/Topbar';
import { Avatar } from '@/components/ui/Avatar';
import { Button, IconButton } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { Input } from '@/components/ui/Input';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingState } from '@/components/ui/LoadingState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Empty } from '@/components/ui/Empty';
import { Modal } from '@/components/ui/Modal';
import { useToast, useToastError } from '@/components/ui/Toast';
import { StatusBadge } from '@/components/StatusBadge';
import { Ic } from '@/components/Ic';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/api/profile';
import { sessionsApi, type Session } from '@/api/sessions';
import { setToken } from '@/api/client';
import { queryKeys } from '@/lib/queryKeys';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { parseUserAgent } from '@/lib/userAgent';
import type { User } from '@/api/types';

type Tab = 'profile' | 'password' | 'sessions';

const profileSchema = z.object({
  name: z.string().min(1, 'Имя обязательно').max(100, 'Максимум 100 символов'),
  email: z
    .string()
    .min(1, 'Email обязателен')
    .email('Неверный формат email')
    .max(255, 'Слишком длинный email'),
});

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Введите текущий пароль'),
    new_password: z.string().min(8, 'Минимум 8 символов').max(32, 'Максимум 32 символа'),
    new_password_confirmation: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((d) => d.new_password === d.new_password_confirmation, {
    message: 'Пароли не совпадают',
    path: ['new_password_confirmation'],
  });

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const ALLOWED_AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/jpg'];

export default function ProfilePage() {
  const { user, setUser, logout } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tab, setTab] = useState<Tab>('profile');

  const uploadAvatarMut = useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (data) => {
      toast.success('Аватар обновлён');
      if (user) setUser({ ...user, avatar_url: data.avatar_url });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => toastError(err, 'Не удалось загрузить аватар'),
  });

  const deleteAvatarMut = useMutation({
    mutationFn: () => profileApi.deleteAvatar(),
    onSuccess: () => {
      toast.success('Аватар удалён');
      if (user) setUser({ ...user, avatar_url: null });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (err) => toastError(err, 'Не удалось удалить аватар'),
  });

  function handleAvatarFile(file: File) {
    if (!ALLOWED_AVATAR_MIMES.includes(file.type)) {
      toast.error('Допустимые форматы: JPEG, PNG, JPG');
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Размер не должен превышать 2 МБ');
      return;
    }
    uploadAvatarMut.mutate(file);
  }

  async function handlePasswordSuccess() {
    toast.success('Пароль изменён. Войдите заново');
    setToken(null);
    setUser(null);
    queryClient.clear();
    void logout();
    navigate('/login', { replace: true });
  }

  if (!user) return null;

  return (
    <>
      <Topbar crumbs={['Профиль']} />
      <div className="content">
        <div className="page-head">
          <div className="title">
            <span className="t-micro">Аккаунт</span>
            <h1 className="h-display">Профиль</h1>
            <span className="muted t-body">
              Личные данные, аватар и пароль вашей учётной записи.
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(280px, 360px) 1fr',
            gap: 24,
            alignItems: 'start',
          }}
        >
          {/* Левая колонка — карточка пользователя */}
          <div className="card">
            <div
              className="card-body"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <Avatar name={user.name} src={user.avatar_url} size="xl" />
              <div
                className="col"
                style={{ alignItems: 'center', gap: 4, textAlign: 'center' }}
              >
                <span className="h-2">{user.name}</span>
                <span className="t-small mono">{user.email}</span>
              </div>
              <StatusBadge kind="role" status={user.role} />

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  width: '100%',
                  paddingTop: 16,
                  borderTop: '1px solid var(--line)',
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAvatarFile(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  icon="download"
                  onClick={() => fileInputRef.current?.click()}
                  loading={uploadAvatarMut.isPending}
                >
                  {user.avatar_url ? 'Сменить аватар' : 'Загрузить аватар'}
                </Button>
                {user.avatar_url && (
                  <Button
                    variant="ghost"
                    icon="trash"
                    loading={deleteAvatarMut.isPending}
                    onClick={() => deleteAvatarMut.mutate()}
                  >
                    Удалить аватар
                  </Button>
                )}
                <span className="t-small dim mt-1" style={{ textAlign: 'center' }}>
                  JPEG / PNG · до 2 МБ
                </span>
              </div>

              <div
                className="t-small"
                style={{
                  paddingTop: 12,
                  borderTop: '1px solid var(--line)',
                  width: '100%',
                  textAlign: 'center',
                  color: 'var(--ink-3)',
                }}
              >
                <span className="row gap-2" style={{ justifyContent: 'center' }}>
                  <Ic name="clock" size={14} /> С нами с {fmtDate(user.created_at)}
                </span>
              </div>
            </div>
          </div>

          {/* Правая колонка — вкладки */}
          <div className="card">
            <div className="card-head" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <Tabs
                tabs={[
                  { id: 'profile', label: 'Данные' },
                  { id: 'password', label: 'Смена пароля' },
                  { id: 'sessions', label: 'Сессии' },
                ]}
                value={tab}
                onChange={(id) => setTab(id)}
              />
            </div>
            <div className="card-body">
              {tab === 'profile' && <ProfileForm user={user} onSaved={(u) => setUser(u)} />}
              {tab === 'password' && <PasswordForm onSuccess={handlePasswordSuccess} />}
              {tab === 'sessions' && <SessionsTab />}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface ProfileFormProps {
  user: User;
  onSaved: (user: User) => void;
}

function ProfileForm({ user, onSaved }: ProfileFormProps) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, email: user.email },
  });

  async function onSubmit(values: ProfileValues) {
    try {
      const updated = await profileApi.update(values);
      onSaved(updated);
      reset(values);
      toast.success('Профиль обновлён');
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    } catch (err) {
      const message = applyApiErrors<ProfileValues>(err, setError, ['name', 'email']);
      if (message) toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
      <Field label="Имя" error={errors.name?.message}>
        <Input {...register('name')} />
      </Field>
      <Field label="Email" error={errors.email?.message}>
        <Input type="email" {...register('email')} />
      </Field>
      <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
        <Button
          type="submit"
          variant="primary"
          icon="check"
          loading={isSubmitting}
          disabled={!isDirty}
        >
          Сохранить
        </Button>
      </div>
    </form>
  );
}

interface PasswordFormProps {
  onSuccess: () => Promise<void> | void;
}

function PasswordForm({ onSuccess }: PasswordFormProps) {
  const toast = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  async function onSubmit(values: PasswordValues) {
    try {
      await profileApi.changePassword(values);
      await onSuccess();
    } catch (err) {
      const message = applyApiErrors<PasswordValues>(err, setError, [
        'current_password',
        'new_password',
        'new_password_confirmation',
      ]);
      if (message) toast.error(message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3">
      <Field label="Текущий пароль" error={errors.current_password?.message}>
        <div style={{ position: 'relative' }}>
          <Input
            type={showCurrent ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            style={{ paddingRight: 38 }}
            {...register('current_password')}
          />
          <IconButton
            icon={showCurrent ? 'eye_off' : 'eye'}
            label={showCurrent ? 'Скрыть' : 'Показать'}
            onClick={() => setShowCurrent((v) => !v)}
            tabIndex={-1}
            style={{ position: 'absolute', right: 4, top: 4 }}
          />
        </div>
      </Field>
      <Field
        label="Новый пароль"
        error={errors.new_password?.message}
        hint="От 8 до 32 символов"
      >
        <div style={{ position: 'relative' }}>
          <Input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            style={{ paddingRight: 38 }}
            {...register('new_password')}
          />
          <IconButton
            icon={showNew ? 'eye_off' : 'eye'}
            label={showNew ? 'Скрыть' : 'Показать'}
            onClick={() => setShowNew((v) => !v)}
            tabIndex={-1}
            style={{ position: 'absolute', right: 4, top: 4 }}
          />
        </div>
      </Field>
      <Field label="Повторите новый пароль" error={errors.new_password_confirmation?.message}>
        <Input
          type={showNew ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          {...register('new_password_confirmation')}
        />
      </Field>

      <div
        className="t-small mt-2"
        style={{
          padding: '8px 12px',
          border: '1px dashed var(--line-2)',
          borderRadius: 'var(--r-md)',
          color: 'var(--ink-3)',
        }}
      >
        После смены пароля все ваши сессии будут завершены и потребуется заново войти в систему.
      </div>

      <div className="row gap-2 mt-2" style={{ justifyContent: 'flex-end' }}>
        <Button type="submit" variant="primary" icon="check" loading={isSubmitting}>
          Сменить пароль
        </Button>
      </div>
    </form>
  );
}

function SessionsTab() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const toastError = useToastError();
  const [confirmingAll, setConfirmingAll] = useState(false);

  const sessionsQ = useQuery({
    queryKey: queryKeys.sessions,
    queryFn: sessionsApi.list,
    staleTime: 30_000,
  });

  const revokeOneMut = useMutation({
    mutationFn: (id: number) => sessionsApi.revoke(id),
    onSuccess: () => {
      toast.success('Сессия завершена');
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
    onError: (err) => toastError(err, 'Не удалось завершить сессию'),
  });

  const revokeAllMut = useMutation({
    mutationFn: () => sessionsApi.revokeOthers(),
    onSuccess: (data) => {
      const n = data.data.revoked;
      toast.success(
        n > 0 ? `Завершено сессий: ${n}` : 'Других активных сессий не было',
      );
      setConfirmingAll(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions });
    },
    onError: (err) => toastError(err, 'Не удалось завершить сессии'),
  });

  if (sessionsQ.isLoading) return <LoadingState label="Загрузка сессий…" />;
  if (sessionsQ.error) {
    return <ErrorState error={sessionsQ.error} onRetry={() => void sessionsQ.refetch()} />;
  }

  const list = sessionsQ.data ?? [];
  const others = list.filter((s) => !s.is_current);

  if (list.length === 0) {
    return <Empty title="Активных сессий нет" />;
  }

  return (
    <>
      <div
        className="row gap-3"
        style={{
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <div className="t-small muted">
          Всего активных сессий: <strong className="mono tnum">{list.length}</strong>
        </div>
        <Button
          variant="danger"
          icon="logout"
          disabled={others.length === 0 || revokeAllMut.isPending}
          loading={revokeAllMut.isPending}
          onClick={() => setConfirmingAll(true)}
        >
          Завершить все остальные
        </Button>
      </div>

      <div className="col" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((s) => (
          <SessionCard
            key={s.id}
            session={s}
            revoking={revokeOneMut.isPending && revokeOneMut.variables === s.id}
            onRevoke={() => revokeOneMut.mutate(s.id)}
          />
        ))}
      </div>

      <Modal
        open={confirmingAll}
        onClose={() => setConfirmingAll(false)}
        title="Завершить все остальные сессии?"
        width={460}
      >
        <p className="t-body">
          Все ваши сессии на других устройствах и браузерах будут завершены. Текущая останется
          активной.
        </p>
        <div className="row gap-2 mt-4" style={{ justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setConfirmingAll(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            icon="logout"
            loading={revokeAllMut.isPending}
            onClick={() => revokeAllMut.mutate()}
          >
            Завершить
          </Button>
        </div>
      </Modal>
    </>
  );
}

interface SessionCardProps {
  session: Session;
  revoking: boolean;
  onRevoke: () => void;
}

function SessionCard({ session, revoking, onRevoke }: SessionCardProps) {
  const ua = parseUserAgent(session.user_agent);
  const deviceIcon =
    ua.device === 'mobile' ? 'box' : ua.device === 'tablet' ? 'box' : 'dashboard';

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        padding: 14,
        alignItems: 'center',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-md)',
        background: session.is_current ? 'var(--bg-muted)' : 'var(--bg-elev)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 'var(--r-md)',
          background: 'var(--bg-sunken)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--ink-2)',
          flex: 'none',
        }}
      >
        <Ic name={deviceIcon} size={18} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="row gap-2"
          style={{ alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}
        >
          <span className="h-2">{ua.browser}</span>
          <span className="t-small dim">·</span>
          <span className="t-small">{ua.os}</span>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 18px',
            fontSize: 12.5,
            color: 'var(--ink-3)',
            lineHeight: 1.5,
          }}
        >
          <span style={{ whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--ink-2)' }}>IP:</strong>{' '}
            <span className="mono">{session.ip_address ?? '—'}</span>
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--ink-2)' }}>Создана:</strong>{' '}
            {fmtDate(session.created_at)}
          </span>
          <span style={{ whiteSpace: 'nowrap' }}>
            <strong style={{ color: 'var(--ink-2)' }}>Активность:</strong>{' '}
            {session.last_used_at ? fmtDateTime(session.last_used_at) : 'не использовалась'}
          </span>
        </div>
      </div>

      {session.is_current ? (
        <span className="badge active" style={{ flex: 'none', alignSelf: 'center' }}>
          <span className="dot" />
          Текущая
        </span>
      ) : (
        <Button
          variant="danger"
          size="sm"
          icon="logout"
          loading={revoking}
          onClick={onRevoke}
          style={{ flex: 'none', alignSelf: 'center', whiteSpace: 'nowrap' }}
        >
          Завершить
        </Button>
      )}
    </div>
  );
}
