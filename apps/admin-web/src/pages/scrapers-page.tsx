import { useTranslation } from 'react-i18next';
import { StoresList } from '@features/marketplace';

export function ScrapersPage(): JSX.Element {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-headline-lg text-on-surface">{t('nav.scrapers')}</h1>
      <section className="mt-md" aria-labelledby="stores-section-heading">
        <h2 id="stores-section-heading" className="sr-only">
          {t('scrapers.stores.empty.title')}
        </h2>
        <StoresList />
      </section>
    </div>
  );
}
