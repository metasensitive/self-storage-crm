import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { authApi } from '@/api/auth';
import { Button, Field, Input } from '@/components/ui';
import { applyApiErrors } from '@/lib/applyApiErrors';
import { Ic } from '@/components/Ic';

const schema = z.object({
  email: z
    .string()
    .min(1, 'Введите email')
    .email('Неверный формат email')
    .max(255, 'Слишком длинный email'),
});

type ForgotValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotValues) {
    setGlobalError(null);
    try {
      await authApi.forgotPassword({ email: values.email });
      setSubmittedEmail(values.email);
    } catch (err) {
      const message = applyApiErrors<ForgotValues>(err, setError, ['email']);
      if (message) setGlobalError(message);
    }
  }

  if (submittedEmail) {
    return (
      <>
        <div className="t-micro">Восстановление</div>
        <h1 className="h-display-sm mt-2">Проверьте почту.</h1>
        <p className="muted mt-2 t-body">
          Если такой пользователь существует, мы отправили инструкции на{' '}
          <strong style={{ color: 'var(--ink)' }}>{submittedEmail}</strong>. Ссылка действительна
          60&nbsp;минут.
        </p>

        <div
          className="row gap-2 mt-6 t-small"
          style={{
            padding: '12px 14px',
            border: '1px dashed var(--line-2)',
            borderRadius: 'var(--r-md)',
            color: 'var(--ink-2)',
          }}
        >
          <Ic name="info" size={14} />
          <span>
            Не пришло письмо? Проверьте папку «Спам» или повторите запрос через минуту.
          </span>
        </div>

        <div className="row gap-2 mt-6">
          <Button
            variant="ghost"
            onClick={() => {
              setSubmittedEmail(null);
              setGlobalError(null);
            }}
          >
            Отправить ещё раз
          </Button>
          <Link to="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Вернуться к входу
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="t-micro">Восстановление</div>
      <h1 className="h-display-sm mt-2">Забыли пароль?</h1>
      <p className="muted mt-2 t-body">
        Укажите email, на который зарегистрирован аккаунт. Мы отправим ссылку для установки нового
        пароля.
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
          Отправить ссылку
        </Button>
      </form>

      <div className="t-small mt-6">
        Вспомнили пароль?{' '}
        <Link
          to="/login"
          style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Войти
        </Link>
      </div>
    </>
  );
}
