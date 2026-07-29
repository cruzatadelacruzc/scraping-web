import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bell, BellRing, Bot, LayoutDashboard, LogOut, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROUTES } from '@shared/config/routes';
import { useAuth } from '@/shared/auth';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';
import { cn } from '@/shared/utils/cn';

const NAV: { to: string; key: string; icon: LucideIcon }[] = [
  { to: ROUTES.DASHBOARD, key: 'dashboard', icon: LayoutDashboard },
  { to: ROUTES.ALARMS, key: 'alarms', icon: BellRing },
  { to: ROUTES.NOTIFICATIONS, key: 'notifications', icon: Bell },
  { to: ROUTES.BOTS, key: 'bots', icon: Bot },
  { to: ROUTES.PROFILE, key: 'profile', icon: User },
];

/** Authenticated app shell (sidebar nav + outlet). */
export const AppLayout = () => {
  const { t } = useTranslation('common');
  const { logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <aside className="hidden w-56 flex-col border-r border-outline-variant bg-surface-container-low p-3 md:flex">
        <span className="mb-4 px-2 font-mono text-sm font-semibold">
          <span className="text-success">◈</span> {t('appName')}
        </span>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={key}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-surface-container-high text-on-surface'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center justify-between gap-2 px-1">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            className="rounded-md p-2 text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-4">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
