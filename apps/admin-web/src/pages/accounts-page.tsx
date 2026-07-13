import { useTranslation } from 'react-i18next';

export function AccountsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">{t('nav.accounts')}</h1>
      <p className="mt-md text-body-md text-on-surface-variant">Account management will appear here.</p>
    </div>
  );
}
