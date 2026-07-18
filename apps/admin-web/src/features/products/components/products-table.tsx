import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { productDetailRoute } from '@shared/config/routes';
import { useDebouncedFilter } from '@shared/hooks/useDebouncedFilter';
import { PackageSearch, Search } from 'lucide-react';

import { useGetProducts } from '../hooks/useGetProducts';

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export function ProductsTable(): JSX.Element {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const search = useDebouncedFilter();
  const category = useDebouncedFilter();
  const minPrice = useDebouncedFilter();
  const maxPrice = useDebouncedFilter();
  const [isOutstanding, setIsOutstanding] = useState(false);
  const [isPromoted, setIsPromoted] = useState(false);

  const handleFilterChange = useCallback(
    <TValue,>(setter: (value: TValue) => void, value: TValue): void => {
      setter(value);
      setPage(1);
    },
    [],
  );

  const { data, isLoading, isError, error, isFetching, refetch } = useGetProducts({
    page,
    limit: pageSize,
    search: search.debouncedValue || undefined,
    category: category.debouncedValue || undefined,
    minPrice: minPrice.debouncedValue ? Number(minPrice.debouncedValue) : undefined,
    maxPrice: maxPrice.debouncedValue ? Number(maxPrice.debouncedValue) : undefined,
    isOutstanding: isOutstanding || undefined,
    isPromoted: isPromoted || undefined,
  });

  const totalPages = data ? Math.ceil(data.total / pageSize) : 0;

  // 1. Loading
  if (isLoading) {
    return (
      <div className="space-y-sm">
        <div className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-9 animate-pulse rounded-sm bg-surface-container-high" />
        ))}
      </div>
    );
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
        <p className="text-danger">
          {error instanceof Error ? error.message : t('products.error.message')}
        </p>
        <button
          onClick={() => {
            void refetch();
          }}
          className="mt-sm rounded-sm bg-danger px-3 py-1 text-sm text-white transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // 3. Empty
  if (!data || data.items.length === 0) {
    return (
      <div className="py-xl text-center">
        <PackageSearch size={48} className="mx-auto text-on-surface-variant" aria-hidden="true" />
        <p className="mt-md text-lg font-semibold text-on-surface">{t('products.empty.title')}</p>
        <p className="mt-sm text-body-sm text-on-surface-variant">
          {t('products.empty.description')}
        </p>
      </div>
    );
  }

  // 4. Data
  return (
    <div>
      {/* Top bar: search + filters */}
      <div className="mb-sm flex flex-wrap items-center gap-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            aria-hidden="true"
          />
          <input
            type="text"
            value={search.value}
            onChange={(e) => {
              handleFilterChange(search.setValue, e.target.value);
            }}
            placeholder={t('products.searchPlaceholder')}
            aria-label={t('products.searchPlaceholder')}
            className="w-full rounded-sm border border-outline-variant bg-surface py-2 pl-9 pr-3 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category filter */}
        <input
          type="text"
          value={category.value}
          onChange={(e) => {
            handleFilterChange(category.setValue, e.target.value);
          }}
          placeholder={t('products.filters.categoryPlaceholder')}
          aria-label={t('products.filters.categoryPlaceholder')}
          className="w-40 rounded-sm border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Min price */}
        <input
          type="number"
          value={minPrice.value}
          onChange={(e) => {
            handleFilterChange(minPrice.setValue, e.target.value);
          }}
          placeholder={t('products.filters.minPrice')}
          aria-label={t('products.filters.minPrice')}
          min={0}
          className="w-28 rounded-sm border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Max price */}
        <input
          type="number"
          value={maxPrice.value}
          onChange={(e) => {
            handleFilterChange(maxPrice.setValue, e.target.value);
          }}
          placeholder={t('products.filters.maxPrice')}
          aria-label={t('products.filters.maxPrice')}
          min={0}
          className="w-28 rounded-sm border border-outline-variant bg-surface px-3 py-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />

        {/* Outstanding toggle */}
        <label className="flex cursor-pointer items-center gap-1 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={isOutstanding}
            onChange={(e) => {
              handleFilterChange(setIsOutstanding, e.target.checked);
            }}
            className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-1 focus:ring-primary"
          />
          {t('products.filters.isOutstanding')}
        </label>

        {/* Promoted toggle */}
        <label className="flex cursor-pointer items-center gap-1 text-body-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={isPromoted}
            onChange={(e) => {
              handleFilterChange(setIsPromoted, e.target.checked);
            }}
            className="h-4 w-4 rounded border-outline-variant bg-surface text-primary focus:ring-1 focus:ring-primary"
          />
          {t('products.filters.isPromoted')}
        </label>
      </div>

      <div className="rounded-md border border-outline-variant">
        {/* Background refetch progress */}
        {isFetching && <div className="h-0.5 w-full animate-pulse bg-primary/20" />}

        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">{t('products.table.caption')}</caption>
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low text-left text-label-xs font-mono uppercase text-on-surface-variant">
                <th className="p-2">{t('products.table.title')}</th>
                <th className="p-2">{t('products.table.price')}</th>
                <th className="p-2">{t('products.table.category')}</th>
                <th className="p-2">{t('products.table.location')}</th>
                <th className="p-2 text-right">{t('products.table.views')}</th>
                <th className="p-2">{t('products.table.status')}</th>
                <th className="p-2">{t('products.table.created')}</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((product) => (
                <tr
                  key={product.id}
                  className="h-9 border-b border-outline-variant transition-colors hover:bg-surface-container-high"
                >
                  <td className="max-w-xs truncate p-2 font-medium">
                    <Link
                      to={productDetailRoute(product.id)}
                      className="text-on-surface transition-colors hover:text-primary"
                    >
                      {product.title}
                    </Link>
                  </td>
                  <td className="p-2 font-mono text-on-surface-variant">
                    {product.currency} {product.price.toFixed(2)}
                  </td>
                  <td className="p-2 text-on-surface-variant">{product.category}</td>
                  <td className="p-2 text-on-surface-variant">{product.locationState ?? '—'}</td>
                  <td className="p-2 text-right font-mono text-on-surface-variant">
                    {product.views ?? '—'}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {product.isOutstanding && (
                        <span className="inline-flex items-center rounded-sm bg-warning/20 px-1.5 py-0.5 text-label-xs font-mono text-warning">
                          {t('products.outstanding')}
                        </span>
                      )}
                      {product.isPromoted && (
                        <span className="inline-flex items-center rounded-sm bg-primary/20 px-1.5 py-0.5 text-label-xs font-mono text-primary">
                          {t('products.promoted')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-2 font-mono text-on-surface-variant">
                    {product.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-outline-variant px-2 py-2">
          {/* Rows per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant">
              {t('products.pagination.rowsPerPage')}
            </span>
            <div className="flex gap-1">
              {PAGE_SIZE_OPTIONS.map((size) => (
                <button
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  className={`rounded-sm px-2 py-1 text-body-sm transition-colors ${
                    pageSize === size
                      ? 'bg-primary/20 text-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                  aria-label={t('products.pagination.rowsPerPage')}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-body-sm text-on-surface-variant">
              {t('products.pagination.info', {
                page,
                totalPages,
                total: data.total,
              })}
            </span>
            <button
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page <= 1}
              className="rounded-sm px-2 py-1 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
              aria-label={t('products.pagination.prev')}
            >
              {t('products.pagination.prev')}
            </button>
            <button
              onClick={() => {
                setPage((p) => p + 1);
              }}
              disabled={page >= totalPages}
              className="rounded-sm px-2 py-1 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-30"
              aria-label={t('products.pagination.next')}
            >
              {t('products.pagination.next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
