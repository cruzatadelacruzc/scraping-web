import { useTranslation } from 'react-i18next';
import { RulesTable } from '@features/rules';

export function RulesPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-md">
      <div>
        <h1 className="text-headline-lg text-on-surface">{t('nav.rules', 'Rules')}</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {t('rules.description', 'Manage word-list extraction rules for the scraping pipeline.')}
        </p>
      </div>
      <RulesTable />
    </div>
  );
}
