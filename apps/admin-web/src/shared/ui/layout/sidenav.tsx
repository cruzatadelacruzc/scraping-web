import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';

interface NavItem {
  labelKey: string;
  path: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { labelKey: 'nav.dashboard', path: ROUTES.DASHBOARD },
  { labelKey: 'nav.accounts', path: ROUTES.ACCOUNTS },
  { labelKey: 'nav.users', path: ROUTES.USERS },
  { labelKey: 'nav.roles', path: ROUTES.ROLES },
  { labelKey: 'nav.products', path: ROUTES.PRODUCTS },
  { labelKey: 'nav.scrapers', path: ROUTES.SCRAPERS },
  { labelKey: 'nav.rules', path: ROUTES.RULES },
  { labelKey: 'nav.queues', path: ROUTES.QUEUES },
  { labelKey: 'nav.settings', path: ROUTES.SETTINGS },
];

function navLinkClassName({ isActive }: { isActive: boolean }): string {
  return `rounded-md px-sm py-xs text-body-sm transition-colors ${
    isActive
      ? 'bg-primary/10 font-medium text-primary'
      : 'text-on-surface-variant hover:bg-surface-container-high'
  }`;
}

export function SideNav(): JSX.Element {
  const { t } = useTranslation();

  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low p-sm">
      {NAV_ITEMS.map((item) => (
        <NavLink key={item.path} to={item.path} className={navLinkClassName}>
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}
