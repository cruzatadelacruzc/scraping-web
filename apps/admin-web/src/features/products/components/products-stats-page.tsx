import { useTranslation } from 'react-i18next';
import { KpiCard } from '@features/dashboard/components/kpi-card';
import { PackageSearch } from 'lucide-react';

import { useGetProductStats } from '../hooks/useGetProductStats';

import { EnrichmentMeter } from './enrichment-meter';
import { ProductsStatsBarChart } from './products-stats-bar-chart';

export function ProductsStatsPage(): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useGetProductStats();

  // 1. Error — full-page error state
  if (isError) {
    return (
      <div className="space-y-xl">
        <h1 className="text-headline-lg text-on-surface">{t('products.stats.title')}</h1>
        <div className="rounded-md border border-danger bg-danger-muted p-md text-sm">
          <p className="text-danger">
            {error instanceof Error ? error.message : t('products.stats.error.message')}
          </p>
          <button
            onClick={() => {
              void refetch();
            }}
            className="mt-sm rounded-sm bg-danger px-3 py-1 text-xs text-white transition-colors hover:bg-danger/80"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // 2. Loading (no data yet)
  if (isLoading) {
    return (
      <div className="space-y-xl">
        <h1 className="text-headline-lg text-on-surface">{t('products.stats.title')}</h1>
        {/* KPI skeletons */}
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <KpiCard key={i} label="" value={0} isLoading />
          ))}
        </div>
        {/* Chart skeletons */}
        <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
          {[1, 2].map((col) => (
            <div
              key={col}
              className="rounded-md border border-outline-variant bg-surface-container p-md"
            >
              <div className="mb-md h-4 w-40 animate-pulse rounded-sm bg-surface-container-high" />
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="h-3 w-20 animate-pulse rounded-sm bg-surface-container-high" />
                    <div
                      className="h-3 animate-pulse rounded-sm bg-surface-container-high"
                      style={{ width: `${String(40 + i * 10)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. Empty / no data (data loaded but totalProducts === 0 or no data)
  if (!data || data.totalProducts === 0) {
    return (
      <div className="space-y-xl">
        <h1 className="text-headline-lg text-on-surface">{t('products.stats.title')}</h1>
        <div className="py-xl text-center">
          <PackageSearch size={48} className="mx-auto text-on-surface-variant" aria-hidden="true" />
          <p className="mt-md text-lg font-semibold text-on-surface">
            {t('products.stats.empty.title')}
          </p>
          <p className="mt-sm text-body-sm text-on-surface-variant">
            {t('products.stats.empty.description')}
          </p>
        </div>
      </div>
    );
  }

  // 4. Data — render the stats
  return (
    <div className="space-y-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-headline-lg text-on-surface">{t('products.stats.title')}</h1>
        {data.lastScrapedLabel !== 'Never' && (
          <span className="text-label-xs font-mono text-on-surface-variant">
            {t('products.stats.lastScraped')}: {data.lastScrapedLabel}
          </span>
        )}
      </div>

      {/* KPI row */}
      <section>
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard label={t('products.stats.totalProducts')} value={data.totalProducts} />
          <KpiCard label={t('products.stats.outstanding')} value={data.outstandingCount} />
          <KpiCard label={t('products.stats.promoted')} value={data.promotedCount} />
          <KpiCard label={t('products.stats.enrichedCount')} value={data.enrichedCount} />
        </div>
      </section>

      {/* Price range stat tile */}
      <section>
        <div className="rounded-md border border-outline-variant bg-surface-container p-md">
          <span className="text-label-xs font-mono text-on-surface-variant">
            {t('products.stats.priceRange')}
          </span>
          <p className="mt-xs text-headline-lg-mobile font-semibold text-on-surface">
            {data.priceRangeLabel}
          </p>
        </div>
      </section>

      {/* Two-column bar charts */}
      <div className="grid grid-cols-1 gap-md lg:grid-cols-2">
        <ProductsStatsBarChart
          title={t('products.stats.byCategory')}
          data={data.byCategory.map((c) => ({ name: c.category, value: c.count }))}
          isLoading={false}
          isError={false}
          chartDescription={t('products.stats.chartDesc.byCategory')}
        />
        <ProductsStatsBarChart
          title={t('products.stats.byState')}
          data={data.byState.map((s) => ({ name: s.state, value: s.count }))}
          isLoading={false}
          isError={false}
          chartDescription={t('products.stats.chartDesc.byState')}
        />
      </div>

      {/* Enrichment meter */}
      <section>
        <EnrichmentMeter
          enrichedCount={data.enrichedCount}
          unenrichedCount={data.unenrichedCount}
          percent={data.enrichmentPercent}
          isLoading={false}
        />
      </section>
    </div>
  );
}
