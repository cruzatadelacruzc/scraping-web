import { useTranslation } from 'react-i18next';
import { RolesTable } from '@features/roles';

export function RolesPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-md">
      <div>
        <h1 className="text-headline-lg text-on-surface">{t('nav.roles')}</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {t('roles.table.title', { count: 0 }).replace(/\(.*?\)/, '').trim()}
        </p>
      </div>
      <RolesTable />
    </div>
  );
}
