import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { Permission, useHasPermission } from '@shared/permissions';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Bell, Cog, Database, Layers, Search, Shield, Users } from 'lucide-react';

interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
  permissions: Permission[];
}

const NAV_ITEMS: readonly NavItem[] = [
  {
    labelKey: 'nav.dashboard',
    path: ROUTES.DASHBOARD,
    icon: BarChart3,
    permissions: [Permission.VIEW_DASHBOARD],
  },
  {
    labelKey: 'nav.accounts',
    path: ROUTES.ACCOUNTS,
    icon: Database,
    permissions: [Permission.VIEW_ACCOUNTS],
  },
  { labelKey: 'nav.users', path: ROUTES.USERS, icon: Users, permissions: [Permission.VIEW_USERS] },
  { labelKey: 'nav.roles', path: ROUTES.ROLES, icon: Shield, permissions: [Permission.VIEW_ROLES] },
  {
    labelKey: 'nav.products',
    path: ROUTES.PRODUCTS,
    icon: Search,
    permissions: [Permission.VIEW_PRODUCTS],
  },
  {
    labelKey: 'nav.scrapers',
    path: ROUTES.SCRAPERS,
    icon: Bell,
    permissions: [Permission.VIEW_SCRAPERS],
  },
  { labelKey: 'nav.rules', path: ROUTES.RULES, icon: Layers, permissions: [Permission.VIEW_RULES] },
  {
    labelKey: 'nav.queues',
    path: ROUTES.QUEUES,
    icon: BarChart3,
    permissions: [Permission.VIEW_QUEUES],
  },
  {
    labelKey: 'nav.settings',
    path: ROUTES.SETTINGS,
    icon: Cog,
    permissions: [Permission.VIEW_SETTINGS],
  },
];

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return `flex items-center gap-md px-md py-sm rounded-l border-r-2 transition-colors duration-150 ease-in-out font-label-md text-label-md ${
    isActive
      ? 'text-on-surface border-primary bg-surface-variant/30'
      : 'text-on-surface-variant border-transparent hover:bg-surface-container-high'
  }`;
}

export function SideNav(): JSX.Element {
  const { t } = useTranslation();
  const hasPermission = useHasPermission();

  const visibleItems = NAV_ITEMS.filter((item) => item.permissions.some(hasPermission));

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low py-sm">
      {visibleItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink key={item.path} to={item.path} className={navLinkClassName}>
            <Icon size={20} />
            {t(item.labelKey)}
          </NavLink>
        );
      })}
    </nav>
  );
}
