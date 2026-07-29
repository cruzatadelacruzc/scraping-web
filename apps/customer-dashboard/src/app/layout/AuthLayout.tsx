import { Link, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/shared/ui/language-switcher';

/** Focused shell for email-deep-link auth routes (forgot/reset/verify). No teaser. */
export const AuthLayout = () => {
  const { t } = useTranslation('common');
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <header className="flex items-center justify-between px-4 py-3">
        <Link to="/" className="font-mono text-sm font-semibold">
          <span className="text-success">◈</span> {t('appName')}
        </Link>
        <LanguageSwitcher />
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-lg border border-outline-variant bg-surface-container p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
