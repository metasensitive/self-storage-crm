import { useMemo } from 'react';
import { getPasswordStrength } from '@/lib/password';
import { Ic } from './Ic';

interface PasswordStrengthMeterProps {
  password: string;
}

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => getPasswordStrength(password), [password]);
  const empty = password.length === 0;

  return (
    <div className="col gap-2" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        className="row gap-2"
        style={{ alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span className="t-small muted">Надёжность пароля</span>
        <span
          className="t-small mono"
          style={{
            color: empty ? 'var(--ink-3)' : strength.color,
            fontWeight: 600,
          }}
        >
          {empty ? '—' : strength.label}
        </span>
      </div>

      {/* Сегментированная полоса: 6 ячеек, заполняются цветом по очереди */}
      <div className="row gap-2" style={{ gap: 4 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 99,
              background:
                i < strength.score && !empty ? strength.color : 'var(--bg-sunken)',
              transition: 'background .2s ease',
            }}
          />
        ))}
      </div>

      <ul
        style={{
          listStyle: 'none',
          padding: 0,
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '4px 14px',
        }}
      >
        {strength.checks.map((c) => (
          <li
            key={c.label}
            className="row gap-2 t-small"
            style={{
              color: c.ok ? 'oklch(0.45 0.10 150)' : 'var(--ink-3)',
              alignItems: 'center',
            }}
          >
            <Ic name={c.ok ? 'check' : 'dot'} size={12} />
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
