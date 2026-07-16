import { useTranslation } from 'react-i18next';
import { ProductsTable } from '@features/products/components/products-table';

export function ProductsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="mb-lg text-headline-lg text-on-surface">{t('nav.products')}</h1>
      <ProductsTable />
    </div>
  );
}
