import { initials } from '@/lib/format';

type AvatarSize = 'md' | 'lg' | 'xl';

interface AvatarProps {
  name?: string | null;
  src?: string | null;
  size?: AvatarSize;
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: AvatarProps) {
  const cls = ['av'];
  if (size === 'lg') cls.push('lg');
  if (size === 'xl') cls.push('xl');
  if (className) cls.push(className);

  return (
    <span className={cls.join(' ')}>
      {src ? (
        <img
          src={src}
          alt={name ?? ''}
          style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
