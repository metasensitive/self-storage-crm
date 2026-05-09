import { NavLink, useNavigate } from 'react-router-dom';
import { Avatar } from './ui/Avatar';
import { IconButton } from './ui/Button';
import { Ic, type IconName } from './Ic';
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
  const { user, role, logout } = useAuth();
  const { tweaks, setTweak } = useTweaks();
  const navigate = useNavigate();

  if (!user || !role) return null;

  const isDark = tweaks.theme === 'dark';
  const toggleTheme = () => setTweak('theme', isDark ? 'light' : 'dark');

  const visible = NAV.filter((n) => n.roles.includes(role));

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

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
        <div className="user-pill">
          <Avatar name={user.name} src={user.avatar_url} />
          <div className="col" style={{ minWidth: 0, flex: 1 }}>
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
          <IconButton
            icon={isDark ? 'sun' : 'moon'}
            label={isDark ? 'Светлая тема' : 'Тёмная тема'}
            onClick={toggleTheme}
          />
          <IconButton icon="logout" label="Выйти" onClick={handleLogout} />
        </div>
      </div>
    </nav>
  );
}
