import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Field, IconButton, Input } from '@/components/ui';
import { applyApiErrors } from '@/lib/applyApiErrors';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Введите email')
    .email('Неверный формат email')
    .max(255, 'Слишком длинный email'),
  password: z.string().min(1, 'Введите пароль').max(255, 'Слишком длинный пароль'),
});

type LoginValues = z.infer<typeof schema>;

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPw, setShowPw] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginValues) {
    setGlobalError(null);
    try {
      await login(values.email, values.password);
      const from = (location.state as LocationState | null)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      const message = applyApiErrors<LoginValues>(err, setError, ['email', 'password']);
      if (message) setGlobalError(message);
    }
  }

  return (
    <>
      <div className="t-micro">Вход в систему</div>
      <h1 className="h-display-sm mt-2">С возвращением.</h1>
      <p className="muted mt-2 t-body">
        Войдите в панель оператора, чтобы управлять локациями, контейнерами и арендами.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="col gap-3 mt-6">
        <Field label="Email" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            aria-invalid={errors.email ? 'true' : undefined}
            {...register('email')}
          />
        </Field>

        <Field label="Пароль" error={errors.password?.message}>
          <div style={{ position: 'relative' }}>
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
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

        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Link
            to="/forgot-password"
            className="t-small"
            style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Забыли пароль?
          </Link>
        </div>

        <Button type="submit" variant="primary" size="lg" loading={isSubmitting}>
          Войти
        </Button>
      </form>
    </>
  );
}
