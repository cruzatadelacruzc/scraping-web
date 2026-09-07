import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button, Input } from '@/shared/ui/forms';
import { Skeleton } from '@/shared/ui/skeleton';
import { useDebouncedValue } from '@/shared/utils/use-debounced-value';
import type { ProductCatalogItem } from '../types';
import { useProductCategories, useProductSearch } from '../hooks/use-products';
import { ProductCard } from './product-picker/product-card';
import {
  buildProductSearchParams,
  nextFilters,
  EMPTY_PRODUCT_PICKER_FILTERS,
  PRODUCT_PAGE_LIMIT,
  type ProductPickerFilters,
} from './product-picker/product-search-params';

interface ProductPickerProps {
  onSelect: (product: ProductCatalogItem) => void;
}

const SELECT_CLASS =
  'h-10 rounded-md border border-outline-variant bg-surface-container-low px-3 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-ring';

/**
 * Searchable catalog browser. Owns its filter/pagination state locally, reads
 * the `products` backend through hooks, and calls `onSelect` with the chosen
 * listing.
 *
 * Pagination: prev/next over the `skip` cursor rather than an accumulating
 * "load more". `useProductSearch` returns one page and already keeps the
 * previous page visible while the next loads (`keepPreviousData`), so a cursor
 * maps onto it directly with no client-side list accumulation.
 */
export function ProductPicker({ onSelect }: ProductPickerProps) {
  const { t } = useTranslation('alarms');
  const [filters, setFilters] = useState<ProductPickerFilters>(EMPTY_PRODUCT_PICKER_FILTERS);

  const debouncedSearch = useDebouncedValue(filters.search, 300);
  const params = useMemo(
    () => buildProductSearchParams({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const categoriesQuery = useProductCategories();
  const productsQuery = useProductSearch(params);

  const categories = categoriesQuery.data ?? [];
  const activeCategory = categories.find((group) => group.category === filters.category);

  const patch = (next: Partial<ProductPickerFilters>) =>
    setFilters((current) => nextFilters(current, next));

  const page = productsQuery.data;
  const canPrev = filters.skip > 0;
  const canNext = Boolean(page?.hasMore);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input
          value={filters.search}
          onChange={(event) => patch({ search: event.target.value })}
          placeholder={t('picker.searchPlaceholder')}
          aria-label={t('picker.searchPlaceholder')}
          className="sm:max-w-xs"
        />

        <select
          className={SELECT_CLASS}
          value={filters.category}
          onChange={(event) => patch({ category: event.target.value })}
          aria-label={t('picker.category')}
        >
          <option value="">{t('picker.allCategories')}</option>
          {categories.map((group) => (
            <option key={group.category} value={group.category}>
              {group.category}
            </option>
          ))}
        </select>

        <select
          className={SELECT_CLASS}
          value={filters.subcategory}
          onChange={(event) => patch({ subcategory: event.target.value })}
          aria-label={t('picker.subcategory')}
          disabled={!activeCategory || activeCategory.subcategories.length === 0}
        >
          <option value="">{t('picker.allSubcategories')}</option>
          {activeCategory?.subcategories.map((sub) => (
            <option key={sub} value={sub}>
              {sub}
            </option>
          ))}
        </select>

        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={filters.minPrice}
          onChange={(event) => patch({ minPrice: event.target.value })}
          placeholder={t('picker.priceFrom')}
          aria-label={t('picker.priceFrom')}
          className="sm:max-w-[8rem]"
        />
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={filters.maxPrice}
          onChange={(event) => patch({ maxPrice: event.target.value })}
          placeholder={t('picker.priceTo')}
          aria-label={t('picker.priceTo')}
          className="sm:max-w-[8rem]"
        />
      </div>

      {productsQuery.isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-64 w-full" />
          ))}
        </div>
      ) : productsQuery.isError ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-outline-variant p-8 text-center">
          <p className="text-sm text-on-surface-variant">{t('picker.error')}</p>
          <Button variant="outline" onClick={() => productsQuery.refetch()}>
            {t('actions.retry', { ns: 'common' })}
          </Button>
        </div>
      ) : !page || page.items.length === 0 ? (
        <p className="rounded-lg border border-outline-variant p-8 text-center text-sm text-on-surface-variant">
          {t('picker.empty')}
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
            <span>{t('picker.resultsCount', { count: page.total })}</span>
          </div>
          <div className="h-0.5 w-full overflow-hidden rounded bg-transparent">
            {productsQuery.isFetching && (
              <div className="h-full w-full animate-pulse rounded bg-outline-variant" />
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {page.items.map((item) => (
              <ProductCard key={item.id} item={item} onSelect={onSelect} />
            ))}
          </div>

          {(canPrev || canNext) && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!canPrev}
                onClick={() => patch({ skip: Math.max(0, filters.skip - PRODUCT_PAGE_LIMIT) })}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
                {t('picker.prev')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!canNext}
                onClick={() => patch({ skip: filters.skip + PRODUCT_PAGE_LIMIT })}
              >
                {t('picker.next')}
                <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
