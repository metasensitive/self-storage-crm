import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { profileApi } from '@/api/profile';
import { Button, Field, IconButton, Input, useToast } from '@/components/ui';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { PasswordStrengthMeter } from '@/components/PasswordStrengthMeter';

const schema = z
  .object({
    current_password: z.string().min(1, 'Введите временный пароль'),
    new_password: z.string().min(8, 'Минимум 8 символов').max(32, 'Максимум 32 символа'),
    new_password_confirmation: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((d) => d.new_password === d.new_password_confirmation, {
    message: 'Пароли не совпадают',
    path: ['new_password_confirmation'],
  })
  .refine((d) => d.new_password !== d.current_password, {
    message: 'Новый пароль должен отличаться от временного',
    path: ['new_password'],
  });

type Values = z.infer<typeof schema>;

export default function FirstLoginPage() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      current_password: '',
      new_password: '',
      new_password_confirmation: '',
    },
  });

  const newPassword = watch('new_password') ?? '';

  async function onSubmit(values: Values) {
    if (!user) return;
    try {
      await profileApi.changePassword(values);
      // Бэк после смены пароля инвалидирует все токены — текущий уже мёртв.
      // Чтобы пользователь не вводил пароль повторно, сразу выполняем login
      // с новым паролем: получаем свежий токен и обновляем AuthContext.
      // detectMustChangePassword вернёт false (updated_at теперь позже created_at),
      // поэтому ProtectedRoute пустит дальше.
      try {
        await login(user.email, values.new_password);
      } catch {
        // Если автологин не удался (что маловероятно сразу после смены) —
        // мягко уводим на форму входа с понятным сообщением.
        navigate('/login', { replace: true, state: { resetSuccess: true } });
        return;
      }
      toast.success('Пароль обновлён');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = applyApiErrors<Values>(err, setError, [
        'current_password',
        'new_password',
        'new_password_confirmation',
      ]);
      if (message) setError('current_password', { type: 'server', message });
    }
  }

  return (
    <>
      <div className="t-micro">Добро пожаловать</div>
      <h1 className="h-display-sm mt-2">Установите свой пароль.</h1>
      <p className="muted mt-2 t-body">
        {user
          ? `Аккаунт ${user.email} только что создан. Прежде чем продолжить, замените временный пароль на свой собственный.`
          : 'Прежде чем продолжить, замените временный пароль на свой собственный.'}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3 mt-6">
        <Field
          label="Временный пароль"
          error={errors.current_password?.message}
          hint="Тот пароль, которым вы только что вошли в систему"
        >
          <div style={{ position: 'relative' }}>
            <Input
              type={showCurrent ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus
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

        <Field label="Новый пароль" error={errors.new_password?.message}>
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

        <PasswordStrengthMeter password={newPassword} />

        <Field
          label="Повторите пароль"
          error={errors.new_password_confirmation?.message}
        >
          <Input
            type={showNew ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            {...register('new_password_confirmation')}
          />
        </Field>

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Сохранить и войти
        </Button>

        <button
          type="button"
          onClick={() => {
            void logout();
            navigate('/login', { replace: true });
          }}
          className="t-small mt-2"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--ink-3)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            alignSelf: 'center',
          }}
        >
          Выйти и войти под другим аккаунтом
        </button>
      </form>
    </>
  );
}
