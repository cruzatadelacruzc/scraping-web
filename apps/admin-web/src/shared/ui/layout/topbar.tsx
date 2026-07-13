import { useTranslation } from 'react-i18next';
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
      <div className="flex items-center gap-sm">
        <a href={ROUTES.DASHBOARD} className="text-sm font-semibold text-on-surface">
          {t('auth.title')}
        </a>
      </div>

      <div className="flex items-center gap-sm">
        {user && (
          <span className="text-body-sm text-on-surface-variant">{user.userId}</span>
        )}
        <button
          onClick={handleLogout}
          className="rounded-md px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
        >
          {t('auth.signOut')}
        </button>
      </div>
    </header>
  );
}
