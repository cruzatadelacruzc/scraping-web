import { NavLink } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';

interface NavItem {
  label: string;
  path: string;
}

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD },
  { label: 'Accounts', path: ROUTES.ACCOUNTS },
  { label: 'Users', path: ROUTES.USERS },
  { label: 'Roles', path: ROUTES.ROLES },
  { label: 'Products', path: ROUTES.PRODUCTS },
  { label: 'Scrapers', path: ROUTES.SCRAPERS },
  { label: 'Rules', path: ROUTES.RULES },
  { label: 'Queues', path: ROUTES.QUEUES },
  { label: 'Settings', path: ROUTES.SETTINGS },
];

export function SideNav(): JSX.Element {
  return (
    <nav className="flex w-60 shrink-0 flex-col border-r border-outline-variant bg-surface-container-low p-sm">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `rounded-md px-sm py-xs text-body-sm transition-colors ${
              isActive
                ? 'bg-primary/10 font-medium text-primary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
