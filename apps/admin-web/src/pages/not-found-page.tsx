import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { SearchX } from 'lucide-react';

/** Design-system 404 view (admin-web-ui.md section 4.3): icon, title, description, CTA. */
export function NotFoundPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <SearchX size={48} className="mx-auto text-on-surface-variant" aria-hidden="true" />
        <h1 className="mt-4 text-headline-lg font-semibold text-on-surface">
          {t('common.notFound')}
        </h1>
        <p className="mt-sm text-body-md text-on-surface-variant">{t('common.notFoundDesc')}</p>
        <Link
          to={ROUTES.DASHBOARD}
          className="mt-md inline-flex items-center rounded-sm bg-primary px-md py-sm text-body-sm font-medium text-on-primary transition-colors hover:opacity-90"
        >
          {t('common.goToDashboard', 'Go to dashboard')}
        </Link>
      </div>
    </div>
  );
}
