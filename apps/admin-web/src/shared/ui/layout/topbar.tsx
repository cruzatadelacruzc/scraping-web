import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';
import { useCurrentUser, useLogout } from '@shared/auth';
import { ROUTES } from '@shared/config/routes';

export function TopBar(): JSX.Element {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const logout = useLogout();

  const handleLogout = (): void => {
    logout();
    window.location.href = ROUTES.LOGIN;
  };

  return (
    <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-outline-variant bg-surface px-md">
      {/* Brand */}
      <div className="flex items-center gap-sm">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary-container text-on-primary-container">
          <Shield size={18} />
        </div>
        <div>
          <a href={ROUTES.DASHBOARD} className="font-headline-lg-mobile text-headline-lg-mobile leading-none tracking-tighter text-primary">
            BazaarSentinel
          </a>
        </div>
      </div>

      {/* User */}
      <div className="flex items-center gap-sm">
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
