import { type KeyboardEvent, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '@shared/auth';
import { NAV_ITEMS, type NavItem } from '@shared/config/nav-items';
import { ROUTES } from '@shared/config/routes';
import { useHasPermission } from '@shared/permissions';
import { Command } from 'cmdk';
import { LogOut } from 'lucide-react';

import { useCommandPalette } from './command-palette-context';

const ITEM_CLASSES =
  'flex cursor-pointer items-center gap-sm rounded-sm px-sm py-xs text-body-sm text-on-surface data-[selected=true]:bg-surface-container-highest';

/** ⌘K command palette: permission-filtered navigation plus quick actions. */
export function CommandPalette(): JSX.Element | null {
  const { t } = useTranslation();
  const { open, setOpen } = useCommandPalette();
  const navigate = useNavigate();
  const logout = useLogout();
  const hasPermission = useHasPermission();

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleNavigate = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate, setOpen],
  );

  const handleSignOut = useCallback(() => {
    logout();
    window.location.href = ROUTES.LOGIN;
  }, [logout]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setOpen(false);
      }
    },
    [setOpen],
  );

  const visibleItems = useMemo(
    () => NAV_ITEMS.filter((item) => item.permissions.some(hasPermission)),
    [hasPermission],
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30" role="presentation" onClick={handleClose} />
      <div
        className="fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2"
        onKeyDown={handleKeyDown}
        role="presentation"
      >
        <Command
          label={t('palette.label', 'Command palette')}
          className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-high shadow-lg"
        >
          <Command.Input
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            placeholder={t('palette.placeholder', 'Type a command or search…')}
            className="w-full border-b border-outline-variant bg-transparent px-md py-sm text-body-md text-on-surface outline-none placeholder:text-on-surface-variant"
          />
          <Command.List className="max-h-72 overflow-y-auto p-xs [&_[cmdk-group-heading]]:px-sm [&_[cmdk-group-heading]]:py-xs [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-label-xs [&_[cmdk-group-heading]]:text-on-surface-variant">
            <Command.Empty className="p-md text-center text-body-sm text-on-surface-variant">
              {t('palette.empty', 'No results found.')}
            </Command.Empty>
            <Command.Group heading={t('palette.navigation', 'Navigation')}>
              {visibleItems.map((item) => (
                <PaletteNavItem key={item.path} item={item} onNavigate={handleNavigate} />
              ))}
            </Command.Group>
            <Command.Group heading={t('palette.actions', 'Actions')}>
              <Command.Item
                value={t('palette.signOut', 'Sign out')}
                onSelect={handleSignOut}
                className={ITEM_CLASSES}
              >
                <LogOut size={16} aria-hidden="true" />
                {t('palette.signOut', 'Sign out')}
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </>
  );
}

interface PaletteNavItemProps {
  item: NavItem;
  onNavigate: (path: string) => void;
}

function PaletteNavItem({ item, onNavigate }: PaletteNavItemProps): JSX.Element {
  const { t } = useTranslation();
  const handleSelect = useCallback(() => {
    onNavigate(item.path);
  }, [onNavigate, item.path]);

  const Icon = item.icon;

  return (
    <Command.Item value={t(item.labelKey)} onSelect={handleSelect} className={ITEM_CLASSES}>
      <Icon size={16} aria-hidden="true" />
      {t(item.labelKey)}
    </Command.Item>
  );
}
