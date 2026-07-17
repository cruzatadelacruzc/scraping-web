import { useTranslation } from 'react-i18next';
import { UsersTable } from '@features/users/components/users-table';

export function UsersPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-lg text-headline-lg text-on-surface">{t('nav.users')}</h1>
      <UsersTable />
    </div>
  );
}
