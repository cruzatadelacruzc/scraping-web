import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ProductsTable } from '@features/products/components/products-table';
import { ROUTES } from '@shared/config/routes';
import { BarChart3 } from 'lucide-react';

export function ProductsPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-lg flex items-center justify-between">
        <h1 className="text-headline-lg text-on-surface">{t('nav.products')}</h1>
        <Link
          to={ROUTES.PRODUCTS_STATS}
          className="flex items-center gap-xs rounded-sm border border-outline-variant px-3 py-1.5 text-body-sm text-on-surface-variant transition-colors hover:border-primary hover:text-on-surface"
        >
          <BarChart3 size={14} />
          {t('products.stats.viewStats')}
        </Link>
      </div>
      <ProductsTable />
    </div>
  );
}
