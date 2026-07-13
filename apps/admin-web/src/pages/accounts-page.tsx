import { useTranslation } from 'react-i18next';
import { AccountsTable } from '@features/accounts/components/accounts-table';

export function AccountsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">{t('nav.accounts')}</h1>
      <div className="mt-lg">
        <AccountsTable />
      </div>
    </div>
  );
}
