import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/api/client';
import { accountsStore } from '@/lib/accounts';
import { Avatar } from './ui/Avatar';
import { Button, IconButton } from './ui/Button';
import { useToast } from './ui/Toast';
import { Ic } from './Ic';
import { StatusBadge } from './StatusBadge';

interface AccountSwitcherProps {
  open: boolean;
  onClose: () => void;
  /** DOM-элемент-якорь, у которого будет позиционироваться поп-ап (user-pill в сайдбаре) */
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function AccountSwitcher({ open, onClose, anchorRef }: AccountSwitcherProps) {
  const { user, accounts, switchAccount, removeAccount, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);

  // Позиционирование поверх анкера (user-pill)
  useEffect(() => {
    if (!open) return;
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPos({
      left: rect.left,
      bottom: window.innerHeight - rect.top + 8,
    });
  }, [open, anchorRef]);

  // Закрытие по клику вне / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const popup = ref.current;
      const anchor = anchorRef.current;
      if (popup && popup.contains(e.target as Node)) return;
      if (anchor && anchor.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, anchorRef]);

  if (!open || !user || !pos) return null;

  // Только сохранённые НЕ-текущие
  const others = accounts.filter((a) => a.id !== user.id);

  async function handleSwitch(id: number) {
    onClose();
    try {
      await switchAccount(id);
      navigate('/dashboard', { replace: true });
    } catch {
      toast.error('Не удалось переключиться на аккаунт');
    }
  }

  function handleAdd() {
    // Гарантируем что текущий аккаунт точно есть в localStorage перед уходом
    // на /login — иначе после нового логина переключиться обратно будет не на что
    // (например, если юзер залогинен сессией, созданной до появления мульти-аккаунтов).
    if (user) {
      const token = getToken();
      if (token) {
        accountsStore.upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar_url: user.avatar_url,
          token,
        });
      }
    }
    onClose();
    navigate('/login', { state: { addAccount: true } });
  }

  async function handleLogout() {
    onClose();
    await logout();
    navigate('/login', { replace: true });
  }

  function handleRemove(id: number) {
    if (id === user?.id) return;
    removeAccount(id);
    toast.info('Аккаунт убран из списка');
  }

  const popupStyle: CSSProperties = {
    position: 'fixed',
    left: pos.left,
    bottom: pos.bottom,
    width: 280,
    background: 'var(--bg-elev)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--r-lg)',
    boxShadow: 'var(--shadow-3)',
    padding: 8,
    zIndex: 90,
    animation: 'pop-in .18s cubic-bezier(.2,.9,.25,1)',
  };

  return (
    <div ref={ref} style={popupStyle} role="dialog" aria-label="Переключить аккаунт">
      {/* Текущий аккаунт */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '8px 10px',
          borderRadius: 'var(--r-md)',
          background: 'var(--bg-muted)',
        }}
      >
        <Avatar name={user.name} src={user.avatar_url} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className="t-body"
            style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {user.name}
          </div>
          <div className="t-small mono" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </div>
        </div>
        <StatusBadge kind="role" status={user.role} />
      </div>

      {others.length > 0 && (
        <>
          <div className="t-micro" style={{ padding: '12px 10px 6px' }}>
            Другие аккаунты
          </div>
          {others.map((a) => (
            <div
              key={a.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '6px 10px',
                borderRadius: 'var(--r-md)',
                cursor: 'pointer',
                transition: 'background .12s ease',
              }}
              onClick={() => handleSwitch(a.id)}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-muted)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar name={a.name} src={a.avatar_url} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  className="t-small"
                  style={{
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {a.name}
                </div>
                <div
                  className="t-small mono dim"
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontSize: 11,
                  }}
                >
                  {a.email}
                </div>
              </div>
              <IconButton
                icon="close"
                label="Убрать аккаунт"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(a.id);
                }}
              />
            </div>
          ))}
        </>
      )}

      <div
        style={{
          marginTop: 8,
          paddingTop: 8,
          borderTop: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <Button
          variant="ghost"
          icon="plus"
          onClick={handleAdd}
          style={{ justifyContent: 'flex-start' }}
        >
          Добавить аккаунт
        </Button>
        <Button
          variant="ghost"
          icon="logout"
          onClick={handleLogout}
          style={{ justifyContent: 'flex-start' }}
        >
          Выйти из аккаунта
        </Button>
      </div>

      <div className="t-small dim" style={{ padding: '8px 10px 4px' }}>
        <span className="row gap-2" style={{ alignItems: 'flex-start' }}>
          <Ic name="info" size={12} />
          <span>Аккаунты хранятся только на этом устройстве.</span>
        </span>
      </div>
    </div>
  );
}
