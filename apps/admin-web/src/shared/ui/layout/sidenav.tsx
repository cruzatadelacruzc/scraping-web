import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, Bell, Cog, Database, Layers, Search, Shield, Users } from 'lucide-react';
import { ROUTES } from '@shared/config/routes';

interface NavItem {
  labelKey: string;
  path: string;
  icon: LucideIcon;
}

const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'nav.dashboard', path: ROUTES.DASHBOARD, icon: BarChart3 },
  { labelKey: 'nav.accounts', path: ROUTES.ACCOUNTS, icon: Database },
  { labelKey: 'nav.users', path: ROUTES.USERS, icon: Users },
  { labelKey: 'nav.roles', path: ROUTES.ROLES, icon: Shield },
  { labelKey: 'nav.products', path: ROUTES.PRODUCTS, icon: Search },
  { labelKey: 'nav.scrapers', path: ROUTES.SCRAPERS, icon: Bell },
  { labelKey: 'nav.rules', path: ROUTES.RULES, icon: Layers },
  { labelKey: 'nav.queues', path: ROUTES.QUEUES, icon: BarChart3 },
  { labelKey: 'nav.settings', path: ROUTES.SETTINGS, icon: Cog },
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

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low py-sm">
      {/* Brand */}
      <div className="mb-xl flex items-center gap-sm px-md">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container text-on-primary-container">
          <Shield size={18} />
        </div>
        <div>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile leading-none tracking-tighter text-primary">
            BazaarSentinel
          </h1>
          <span className="font-label-xs text-label-xs uppercase tracking-widest text-on-surface-variant">
            Admin Suite
          </span>
        </div>
      </div>

      {/* Nav items */}
      {NAV_ITEMS.map((item) => {
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
