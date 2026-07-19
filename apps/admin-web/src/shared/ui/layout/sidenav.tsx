import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@shared/config/nav-items';
import { useHasPermission } from '@shared/permissions';

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
