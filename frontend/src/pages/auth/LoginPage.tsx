import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button, Field, IconButton, Input } from '@/components/ui';
import { isApiError } from '@/api/client';

interface LocationState {
  from?: string;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      const from = (location.state as LocationState | null)?.from ?? '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      setError(isApiError(err) ? err.body.message : 'Не удалось войти');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="t-micro">Вход в систему</div>
      <h1 className="h-display-sm mt-2">С возвращением.</h1>
      <p className="muted mt-2 t-body">
        Войдите в панель оператора, чтобы управлять локациями, контейнерами и арендами.
      </p>

      <form onSubmit={handleSubmit} className="col gap-3 mt-6">
        <Field label="Email">
          <Input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
          />
        </Field>
        <Field label="Пароль" error={error ?? undefined}>
          <div style={{ position: 'relative' }}>
            <Input
              type={showPw ? 'text' : 'password'}
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={{ paddingRight: 38 }}
            />
            <IconButton
              icon={showPw ? 'eye_off' : 'eye'}
              label={showPw ? 'Скрыть' : 'Показать'}
              onClick={() => setShowPw((v) => !v)}
              style={{ position: 'absolute', right: 4, top: 4 }}
            />
          </div>
        </Field>
        <div className="row" style={{ justifyContent: 'flex-end' }}>
          <Link
            to="/forgot-password"
            className="t-small"
            style={{ color: 'var(--ink)', textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            Забыли пароль?
          </Link>
        </div>
        <Button type="submit" variant="primary" size="lg" loading={submitting}>
          Войти
        </Button>
      </form>
    </>
  );
}
