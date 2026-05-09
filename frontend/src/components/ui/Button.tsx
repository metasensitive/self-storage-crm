import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Ic, type IconName } from '../Ic';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'default',
    size = 'md',
    icon,
    iconRight,
    loading = false,
    disabled,
    type = 'button',
    className,
    children,
    ...rest
  },
  ref,
) {
  const cls = ['btn'];
  if (variant === 'primary') cls.push('btn-primary');
  if (variant === 'ghost') cls.push('btn-ghost');
  if (variant === 'danger') cls.push('btn-danger');
  if (size === 'sm') cls.push('sm');
  if (size === 'lg') cls.push('lg');
  if (className) cls.push(className);

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cls.join(' ')}
      style={{ justifyContent: 'center' }}
      {...rest}
    >
      {icon && !loading && <Ic name={icon} className="ic" />}
      {loading && <Ic name="refresh" className="ic" />}
      {children}
      {iconRight && <Ic name={iconRight} className="ic" />}
    </button>
  );
});

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  iconSize?: number;
  label?: string;
}

export function IconButton({
  icon,
  iconSize = 16,
  label,
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={['icon-btn', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <Ic name={icon} size={iconSize} />
    </button>
  );
}
