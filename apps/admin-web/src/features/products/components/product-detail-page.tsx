import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { type TabItem, Tabs } from '@shared/ui/tabs';
import { ChevronLeft } from 'lucide-react';

import { useGetProduct } from '../hooks/product-detail-hooks';
import {
  useGetLocationHistory,
  useGetOutstandingHistory,
  useGetPriceHistory,
  useGetPromotedHistory,
  useGetViewsHistory,
} from '../hooks/product-history-hooks';
import { aggregateNumericEntries, filterByTimeRange } from '../mappers/product-history-mapper';
import type {
  HistoryEntryViewModel,
  LocationHistoryEntryViewModel,
  StatusHistoryEntryViewModel,
} from '../view-models/product-history-view-model';

import { EventTimeline } from './event-timeline';
import { HistoryChart } from './history-chart';
import { StepChart } from './step-chart';
import { type PresetRange, TimeRangeSelector } from './time-range-selector';

// Color tokens matching the brand palette (consistent with Task 3)
const PRICE_COLOR = '#ec4899'; // primary
const PRICE_FILL = '#ec4899';
const VIEWS_COLOR = '#bec6e0'; // tertiary
const VIEWS_FILL = '#bec6e0';
const OUTSTANDING_COLOR = '#f59e0b'; // warning / amber
const PROMOTED_COLOR = '#10b981'; // success / emerald

const EMPTY_HISTORY: HistoryEntryViewModel[] = [];
const EMPTY_LOCATION: LocationHistoryEntryViewModel[] = [];
const EMPTY_STATUS: StatusHistoryEntryViewModel[] = [];

function priceFormatter(v: number): string {
  return `$${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function viewsFormatter(v: number): string {
  return v.toLocaleString();
}

interface RangeState {
  start: Date | null;
  end: Date | null;
  preset: PresetRange;
}

interface ProductDetailPageProps {
  productId: string;
}

interface NumericHistoryTabProps {
  data: HistoryEntryViewModel[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  chartType: 'line' | 'area';
  seriesLabel: string;
  valueFormatter: (v: number) => string;
  color: string;
  fillColor: string;
  chartDescription: string;
  timeRange: RangeState;
}

function NumericHistoryTab({
  data,
  isLoading,
  isError,
  refetch,
  chartType,
  seriesLabel,
  valueFormatter: formatterFn,
  color,
  fillColor,
  chartDescription,
  timeRange,
}: NumericHistoryTabProps): JSX.Element {
  const filtered: HistoryEntryViewModel[] = useMemo(() => {
    if (isLoading || isError) return data;
    const rangeFiltered: HistoryEntryViewModel[] = [];
    for (const e of data) {
      const t = new Date(e.updatedAt).getTime();
      if (timeRange.start && t < timeRange.start.getTime()) continue;
      if (timeRange.end && t >= timeRange.end.getTime()) continue;
      rangeFiltered.push(e);
    }
    return aggregateNumericEntries(rangeFiltered);
  }, [data, isLoading, isError, timeRange]);

  return (
    <HistoryChart
      data={filtered}
      chartType={chartType}
      seriesLabel={seriesLabel}
      valueFormatter={formatterFn}
      color={color}
      fillColor={fillColor}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      chartDescription={chartDescription}
    />
  );
}

interface LocationHistoryTabProps {
  data: LocationHistoryEntryViewModel[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  timeRange: RangeState;
}

function LocationHistoryTab({
  data,
  isLoading,
  isError,
  refetch,
  timeRange,
}: LocationHistoryTabProps): JSX.Element {
  const filtered: LocationHistoryEntryViewModel[] = useMemo(() => {
    if (isLoading || isError) return data;
    return filterByTimeRange<LocationHistoryEntryViewModel>(data, timeRange.start, timeRange.end);
  }, [data, isLoading, isError, timeRange]);

  return (
    <EventTimeline entries={filtered} isLoading={isLoading} isError={isError} onRetry={refetch} />
  );
}

interface StatusHistoryTabProps {
  data: StatusHistoryEntryViewModel[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  activeLabel: string;
  inactiveLabel: string;
  activeColor: string;
  chartDescription: string;
  timeRange: RangeState;
}

function StatusHistoryTab({
  data,
  isLoading,
  isError,
  refetch,
  activeLabel,
  inactiveLabel,
  activeColor,
  chartDescription,
  timeRange,
}: StatusHistoryTabProps): JSX.Element {
  const filtered: StatusHistoryEntryViewModel[] = useMemo(() => {
    if (isLoading || isError) return data;
    return filterByTimeRange<StatusHistoryEntryViewModel>(data, timeRange.start, timeRange.end);
  }, [data, isLoading, isError, timeRange]);

  return (
    <StepChart
      data={filtered}
      isLoading={isLoading}
      isError={isError}
      onRetry={refetch}
      activeLabel={activeLabel}
      inactiveLabel={inactiveLabel}
      activeColor={activeColor}
      chartDescription={chartDescription}
    />
  );
}

export function ProductDetailPage({ productId }: ProductDetailPageProps): JSX.Element {
  const { t } = useTranslation();

  const productQuery = useGetProduct(productId);
  const priceQuery = useGetPriceHistory(productId);
  const viewsQuery = useGetViewsHistory(productId);
  const locationQuery = useGetLocationHistory(productId);
  const outstandingQuery = useGetOutstandingHistory(productId);
  const promotedQuery = useGetPromotedHistory(productId);

  // Time range state — shared across all tabs, client-side filtering only
  const [timeRange, setTimeRange] = useState<RangeState>({
    start: null,
    end: null,
    preset: 'all',
  });

  const handleRangeChange = useCallback(
    (range: { start: Date | null; end: Date | null; preset: PresetRange }) => {
      setTimeRange(range);
    },
    [],
  );

  // 1. Loading skeleton for the whole page
  if (productQuery.isLoading) {
    return (
      <div className="animate-pulse" role="status" aria-label={t('common.loading')}>
        {/* Header skeleton */}
        <div className="mb-lg">
          <div className="mb-2 h-6 w-24 rounded-sm bg-surface-container-high" />
          <div className="mb-1 h-8 w-64 rounded-sm bg-surface-container-high" />
          <div className="h-4 w-48 rounded-sm bg-surface-container-high" />
        </div>
        {/* Tabs skeleton */}
        <div className="mb-md flex gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 w-20 rounded-sm bg-surface-container-high" />
          ))}
        </div>
        {/* Chart skeleton */}
        <div className="h-60 rounded-md bg-surface-container-high" />
      </div>
    );
  }

  // Error handling — differentiate 404 from other failures
  if (productQuery.isError) {
    const axiosError = productQuery.error as {
      response?: { status?: number };
    } | null;
    const errorStatus = axiosError?.response?.status ?? null;

    // 404 — not found
    if (errorStatus === 404) {
      return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <svg
            width={48}
            height={48}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="text-on-surface-variant"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <h2 className="mt-lg text-headline-md font-semibold text-on-surface">
            {t('products.detail.notFound')}
          </h2>
          <p className="mt-sm text-body-sm text-on-surface-variant">
            {t('products.detail.notFoundDesc')}
          </p>
          <Link
            to={ROUTES.PRODUCTS}
            className="mt-md rounded-sm bg-primary px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-primary/80"
          >
            {t('products.detail.goToCatalog')}
          </Link>
        </div>
      );
    }

    // Non-404 error — show error state with Retry
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-md border border-outline-variant bg-surface-container p-md text-center">
        <p className="text-body-sm text-danger">
          {productQuery.error instanceof Error
            ? productQuery.error.message
            : t('products.history.error')}
        </p>
        <button
          onClick={() => void productQuery.refetch()}
          className="mt-sm rounded-sm bg-danger px-3 py-1 text-xs text-white transition-colors hover:bg-danger/80"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (!productQuery.data) {
    // Should not happen — loading/error handled above. Fallback for TS strict.
    return <div />;
  }

  const product = productQuery.data;

  const buildRefetch = (refetchFn: () => Promise<unknown>): (() => void) => {
    return () => {
      void refetchFn();
    };
  };

  // Build tab items (no useMemo — avoids hooks-ordering issues with early returns)
  const tabs: TabItem[] = [
    {
      id: 'overview',
      label: t('products.detail.tabs.overview'),
      content: (
        <div className="grid gap-md md:grid-cols-2">
          {/* Current Status */}
          <div className="rounded-md border border-outline-variant bg-surface-container p-md">
            <h3 className="mb-md text-body-sm font-semibold text-on-surface">
              {t('products.detail.currentStatus')}
            </h3>
            <div className="flex flex-wrap gap-2">
              {product.isOutstanding && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-warning/20 px-2 py-0.5 text-label-xs font-medium text-warning">
                  {t('products.outstanding')}
                </span>
              )}
              {product.isPromoted && (
                <span className="inline-flex items-center gap-1 rounded-sm bg-success/20 px-2 py-0.5 text-label-xs font-medium text-success">
                  {t('products.promoted')}
                </span>
              )}
              {!product.isOutstanding && !product.isPromoted && (
                <span className="text-body-xs text-on-surface-variant">
                  {t('products.detail.standard')}
                </span>
              )}
            </div>
            <div className="mt-md space-y-2">
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.price')}
                </span>
                <span className="text-body-sm font-mono font-semibold text-on-surface">
                  {priceFormatter(product.price)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.views')}
                </span>
                <span className="text-body-sm font-mono text-on-surface">
                  {product.views != null ? viewsFormatter(product.views) : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.created')}
                </span>
                <span className="text-body-sm font-mono text-on-surface">
                  {product.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Seller Info */}
          <div className="rounded-md border border-outline-variant bg-surface-container p-md">
            <h3 className="mb-md text-body-sm font-semibold text-on-surface">
              {t('products.detail.sellerInfo')}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.name')}
                </span>
                <span className="text-body-sm text-on-surface">{product.sellerName ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.location')}
                </span>
                <span className="text-body-sm text-on-surface">{product.locationState ?? '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label-xs text-on-surface-variant">
                  {t('products.detail.category')}
                </span>
                <span className="text-body-sm text-on-surface">{product.category}</span>
              </div>
              {product.sellerPhone && (
                <div className="flex justify-between">
                  <span className="text-label-xs text-on-surface-variant">
                    {t('products.detail.phone')}
                  </span>
                  <span className="text-body-sm text-on-surface">{product.sellerPhone}</span>
                </div>
              )}
              {product.sellerEmail && (
                <div className="flex justify-between">
                  <span className="text-label-xs text-on-surface-variant">
                    {t('products.detail.email')}
                  </span>
                  <span className="text-body-sm text-on-surface">{product.sellerEmail}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'price',
      label: t('products.detail.tabs.price'),
      content: (
        <NumericHistoryTab
          data={priceQuery.data ?? EMPTY_HISTORY}
          isLoading={priceQuery.isLoading}
          isError={priceQuery.isError}
          refetch={buildRefetch(() => priceQuery.refetch())}
          chartType="line"
          seriesLabel={t('products.detail.price')}
          valueFormatter={priceFormatter}
          color={PRICE_COLOR}
          fillColor={PRICE_FILL}
          chartDescription={t('products.history.chartDesc.price')}
          timeRange={timeRange}
        />
      ),
    },
    {
      id: 'views',
      label: t('products.detail.tabs.views'),
      content: (
        <NumericHistoryTab
          data={viewsQuery.data ?? EMPTY_HISTORY}
          isLoading={viewsQuery.isLoading}
          isError={viewsQuery.isError}
          refetch={buildRefetch(() => viewsQuery.refetch())}
          chartType="area"
          seriesLabel={t('products.detail.views')}
          valueFormatter={viewsFormatter}
          color={VIEWS_COLOR}
          fillColor={VIEWS_FILL}
          chartDescription={t('products.history.chartDesc.views')}
          timeRange={timeRange}
        />
      ),
    },
    {
      id: 'location',
      label: t('products.detail.tabs.location'),
      content: (
        <LocationHistoryTab
          data={locationQuery.data ?? EMPTY_LOCATION}
          isLoading={locationQuery.isLoading}
          isError={locationQuery.isError}
          refetch={buildRefetch(() => locationQuery.refetch())}
          timeRange={timeRange}
        />
      ),
    },
    {
      id: 'outstanding',
      label: t('products.detail.tabs.outstanding'),
      content: (
        <StatusHistoryTab
          data={outstandingQuery.data ?? EMPTY_STATUS}
          isLoading={outstandingQuery.isLoading}
          isError={outstandingQuery.isError}
          refetch={buildRefetch(() => outstandingQuery.refetch())}
          activeLabel={t('products.outstanding')}
          inactiveLabel={t('products.detail.standard')}
          activeColor={OUTSTANDING_COLOR}
          chartDescription={t('products.history.chartDesc.outstanding')}
          timeRange={timeRange}
        />
      ),
    },
    {
      id: 'promoted',
      label: t('products.detail.tabs.promoted'),
      content: (
        <StatusHistoryTab
          data={promotedQuery.data ?? EMPTY_STATUS}
          isLoading={promotedQuery.isLoading}
          isError={promotedQuery.isError}
          refetch={buildRefetch(() => promotedQuery.refetch())}
          activeLabel={t('products.promoted')}
          inactiveLabel={t('products.detail.notPromoted')}
          activeColor={PROMOTED_COLOR}
          chartDescription={t('products.history.chartDesc.promoted')}
          timeRange={timeRange}
        />
      ),
    },
  ] as TabItem[];

  return (
    <div>
      {/* Back link */}
      <Link
        to={ROUTES.PRODUCTS}
        className="mb-md flex items-center gap-1 text-body-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ChevronLeft size={14} />
        {t('products.detail.backToCatalog')}
      </Link>

      {/* Header */}
      <div className="mb-lg">
        <h1 className="text-headline-lg font-semibold text-on-surface">{product.title}</h1>
        <div className="mt-xs flex flex-wrap items-center gap-2">
          <span className="text-body-sm text-on-surface-variant">{product.category}</span>
          <span className="text-on-surface-variant">·</span>
          <span className="text-headline-sm font-mono font-semibold text-primary">
            {priceFormatter(product.price)}
          </span>
          {product.locationState && (
            <>
              <span className="text-on-surface-variant">·</span>
              <span className="text-body-sm text-on-surface-variant">{product.locationState}</span>
            </>
          )}
        </div>
      </div>

      {/* Time range selector — above tabs, scopes all history */}
      <div className="mb-md">
        <TimeRangeSelector value={timeRange.preset} onChange={handleRangeChange} />
      </div>

      {/* Tabbed history sections */}
      <Tabs tabs={tabs} label={t('products.detail.tabsLabel')} />
    </div>
  );
}
