import { useTranslation } from 'react-i18next';
import { AccountsTable } from '@features/accounts/components/accounts-table';

export function AccountsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-lg text-headline-lg text-on-surface">{t('nav.accounts')}</h1>
      <AccountsTable />
    </div>
  );
}
