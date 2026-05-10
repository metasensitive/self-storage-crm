import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from './ui/Avatar';
import { IconButton } from './ui/Button';
import { Ic, type IconName } from './Ic';
import { AccountSwitcher } from './AccountSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useTweaks } from '@/hooks/useTweaks';
import type { Role } from '@/api/types';

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
  roles: Role[];
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Дашборд', icon: 'dashboard', roles: ['admin', 'manager'] },
  { to: '/locations', label: 'Локации', icon: 'pin', roles: ['admin', 'manager'] },
  { to: '/containers', label: 'Контейнеры', icon: 'box', roles: ['admin', 'manager'] },
  { to: '/units', label: 'Кладовки', icon: 'grid', roles: ['admin', 'manager'] },
  { to: '/rents', label: 'Аренды', icon: 'receipt', roles: ['admin', 'manager'] },
  { to: '/analytics', label: 'Аналитика', icon: 'chart', roles: ['admin', 'manager'] },
  { to: '/users', label: 'Сотрудники', icon: 'user', roles: ['admin'] },
];

export function Sidebar() {
  const { user, role } = useAuth();
  const { tweaks, setTweak } = useTweaks();
  const navigate = useNavigate();
  const pillRef = useRef<HTMLButtonElement>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  if (!user || !role) return null;

  const isDark = tweaks.theme === 'dark';
  const toggleTheme = () => setTweak('theme', isDark ? 'light' : 'dark');

  const visible = NAV.filter((n) => n.roles.includes(role));
  void navigate;

  return (
    <nav className="sidebar">
      <div className="brand">
        <div className="brand-mark">S</div>
        <div className="col">
          <div className="brand-name">Storehaus</div>
          <div className="brand-sub">Operations</div>
        </div>
      </div>

      <div className="nav-section">
        <span className="label">Управление</span>
      </div>
      {visible.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <Ic name={n.icon} className="ic" />
          <span>{n.label}</span>
        </NavLink>
      ))}

      <div className="nav-section">
        <span className="label">Аккаунт</span>
      </div>
      <NavLink
        to="/profile"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <Ic name="settings" className="ic" />
        <span>Профиль</span>
      </NavLink>

      <div className="sidebar-foot">
        <button
          ref={pillRef}
          type="button"
          className="user-pill user-pill-btn"
          onClick={() => setSwitcherOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={switcherOpen}
          title="Переключить аккаунт"
        >
          <Avatar name={user.name} src={user.avatar_url} />
          <div className="col" style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user.name}
            </div>
            <div
              className="t-small"
              style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {user.email}
            </div>
          </div>
          <Ic name="chev_d" size={14} className="ic" />
        </button>

        <div className="row gap-2 mt-2" style={{ paddingLeft: 8, paddingRight: 4 }}>
          <IconButton
            icon={isDark ? 'sun' : 'moon'}
            label={isDark ? 'Светлая тема' : 'Тёмная тема'}
            onClick={toggleTheme}
          />
        </div>

        <AccountSwitcher
          open={switcherOpen}
          onClose={() => setSwitcherOpen(false)}
          anchorRef={pillRef}
        />
      </div>
    </nav>
  );
}
