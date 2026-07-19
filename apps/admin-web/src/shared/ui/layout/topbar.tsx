import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Deliberate shell -> feature import: the app shell hosts the Notification
// Center trigger. No cycle: features/notifications never imports the layout.
import { NotificationBell } from '@features/notifications';
import { useCurrentUser, useLogout } from '@shared/auth';
import { useCommandPalette } from '@shared/command-palette';
import { ROUTES } from '@shared/config/routes';
import { Search, Shield } from 'lucide-react';

export function TopBar(): JSX.Element {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const logout = useLogout();
  const { setOpen } = useCommandPalette();

  const handleLogout = (): void => {
    logout();
    window.location.href = ROUTES.LOGIN;
  };

  const handleOpenPalette = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-outline-variant bg-surface px-md">
      {/* Brand */}
      <div className="flex items-center gap-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container text-on-primary-container">
          <Shield size={18} />
        </div>
        <div>
          <a
            href={ROUTES.DASHBOARD}
            className="font-headline-lg-mobile text-headline-lg-mobile leading-none tracking-tighter text-primary"
          >
            BazaarSentinel
          </a>
        </div>
      </div>

      {/* Command palette trigger */}
      <button
        onClick={handleOpenPalette}
        aria-label={t('palette.open', 'Open command palette')}
        className="flex items-center gap-xs rounded-md border border-outline-variant px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
      >
        <Search size={14} aria-hidden="true" />
        <kbd className="rounded-sm bg-surface-container-high px-xs text-label-xs font-mono">⌘K</kbd>
      </button>

      {/* User */}
      <div className="flex items-center gap-sm">
        <NotificationBell />
        {user && (
          <>
            <span className="text-body-sm font-medium text-on-surface">{user.username}</span>
            <span className="rounded-sm bg-surface-container-high px-xs py-0.5 text-label-xs font-mono text-primary">
              {user.roles[0]}
            </span>
          </>
        )}
        <button
          onClick={handleLogout}
          className="rounded-md px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          aria-label={t('auth.signOut')}
        >
          {t('auth.signOut')}
        </button>
      </div>
    </header>
  );
}
