import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { ShieldX } from 'lucide-react';

import type { Permission } from './permission';
import { useHasPermission } from './useHasPermission';

interface Props {
  permissions: Permission[];
  children: ReactNode;
}

/**
 * Route-level guard that renders children only when the user has at least one of
 * the required permissions. Otherwise renders a full-page 403 Forbidden view.
 *
 * Does NOT redirect — the user stays on the blocked URL.
 * Does NOT toast — 403 is surfaced as the page content.
 */
export function RequirePermission({ permissions, children }: Props): JSX.Element {
  const hasPermission = useHasPermission();

  if (permissions.some(hasPermission)) {
    return <>{children}</>;
  }

  return <ForbiddenView />;
}

function ForbiddenView(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface">
      <div className="text-center">
        <ShieldX size={48} className="mx-auto text-on-surface-variant" />
        <h1 className="mt-4 text-headline-lg font-semibold text-on-surface">
          {t('forbidden.title')}
        </h1>
        <p className="mt-sm text-body-md text-on-surface-variant">{t('forbidden.description')}</p>
        <Link
          to={ROUTES.DASHBOARD}
          className="mt-md inline-flex items-center rounded-sm bg-primary px-md py-sm text-body-sm font-medium text-on-primary transition-colors hover:opacity-90"
        >
          {t('forbidden.action')}
        </Link>
      </div>
    </div>
  );
}
