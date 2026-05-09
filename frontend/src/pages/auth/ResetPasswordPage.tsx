import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';
import { Button, Field, IconButton, Input } from '@/components/ui';
import { applyApiErrors } from '@/lib/applyApiErrors';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .max(32, 'Максимум 32 символа'),
    password_confirmation: z.string().min(1, 'Подтвердите пароль'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Пароли не совпадают',
    path: ['password_confirmation'],
  });

type ResetValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get('token') ?? '';
  const email = params.get('email') ?? '';
  const linkValid = useMemo(() => token.length > 0 && email.length > 0, [token, email]);

  const [showPw, setShowPw] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', password_confirmation: '' },
  });

  async function onSubmit(values: ResetValues) {
    setGlobalError(null);
    try {
      await authApi.resetPassword({
        email,
        token,
        password: values.password,
        password_confirmation: values.password_confirmation,
      });
      navigate('/login', { replace: true, state: { resetSuccess: true } });
    } catch (err) {
      const message = applyApiErrors<ResetValues>(err, setError, [
        'password',
        'password_confirmation',
      ]);
      if (message) setGlobalError(message);
    }
  }

  if (!linkValid) {
    return (
      <>
        <div className="t-micro">Сброс пароля</div>
        <h1 className="h-display-sm mt-2">Неверная ссылка.</h1>
        <p className="muted mt-2 t-body">
          В адресе нет токена или email. Скорее всего, ссылка повреждена. Запросите восстановление
          ещё раз.
        </p>
        <div className="row gap-2 mt-6">
          <Link to="/forgot-password" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Запросить ссылку
          </Link>
          <Link to="/login" className="btn" style={{ textDecoration: 'none' }}>
            К входу
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="t-micro">Сброс пароля</div>
      <h1 className="h-display-sm mt-2">Установите новый пароль.</h1>
      <p className="muted mt-2 t-body">
        Для аккаунта <strong style={{ color: 'var(--ink)' }}>{email}</strong>. После сохранения все
        активные сессии будут завершены.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3 mt-6">
        <Field label="Новый пароль" error={errors.password?.message} hint="От 8 до 32 символов">
          <div style={{ position: 'relative' }}>
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={errors.password ? 'true' : undefined}
              style={{ paddingRight: 38 }}
              {...register('password')}
            />
            <IconButton
              icon={showPw ? 'eye_off' : 'eye'}
              label={showPw ? 'Скрыть пароль' : 'Показать пароль'}
              onClick={() => setShowPw((v) => !v)}
              tabIndex={-1}
              style={{ position: 'absolute', right: 4, top: 4 }}
            />
          </div>
        </Field>

        <Field label="Повторите пароль" error={errors.password_confirmation?.message}>
          <Input
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            aria-invalid={errors.password_confirmation ? 'true' : undefined}
            {...register('password_confirmation')}
          />
        </Field>

        {globalError && (
          <div
            className="t-small"
            role="alert"
            style={{
              color: 'var(--st-blocked)',
              padding: '8px 12px',
              border: '1px solid oklch(0.86 0.05 25)',
              borderRadius: 'var(--r-md)',
              background: 'oklch(0.96 0.03 25)',
            }}
          >
            {globalError}
          </div>
        )}

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Сохранить новый пароль
        </Button>
      </form>

      <div className="t-small mt-6">
        <Link
          to="/login"
          style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Отменить и вернуться к входу
        </Link>
      </div>
    </>
  );
}
