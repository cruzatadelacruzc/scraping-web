import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';

export function NotFound() {
  const { t } = useTranslation('common');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface text-center text-on-surface">
      <SearchX className="h-12 w-12 text-on-surface-variant" aria-hidden="true" />
      <h1 className="text-lg font-semibold">404</h1>
      <Link
        to="/"
        className="text-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        {t('nav.dashboard')}
      </Link>
    </div>
  );
}
