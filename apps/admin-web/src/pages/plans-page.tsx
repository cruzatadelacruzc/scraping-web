import { useTranslation } from 'react-i18next';
import { PlansTable } from '@features/plans/components/plans-table';

export function PlansPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-lg text-headline-lg text-on-surface">{t('nav.plans')}</h1>
      <PlansTable />
    </div>
  );
}
