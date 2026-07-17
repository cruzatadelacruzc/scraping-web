import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChartSkeleton } from '@shared/ui/skeletons/chart-skeleton';

import type { LocationHistoryEntryViewModel } from '../view-models/product-history-view-model';

import { EmptyState } from './empty-state';

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatLocation(entry: LocationHistoryEntryViewModel): string {
  const { state, municipality } = entry.location;
  if (municipality && municipality !== state) {
    return `${state} → ${municipality}`;
  }
  return state;
}

interface EventTimelineProps {
  entries: LocationHistoryEntryViewModel[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function EventTimelineInner({
  entries,
  isLoading,
  isError,
  onRetry,
}: EventTimelineProps): JSX.Element {
  const { t } = useTranslation();

  // 1. Loading
  if (isLoading) {
    return <ChartSkeleton />;
  }

  // 2. Error
  if (isError) {
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container p-md">
        <div className="flex flex-col items-center justify-center py-xl text-center">
          <p className="text-body-sm text-danger">{t('products.history.error')}</p>
          <button
            onClick={onRetry}
            className="mt-sm rounded-sm bg-danger px-3 py-1 text-xs text-white transition-colors hover:bg-danger/80"
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  // 3. Empty
  if (entries.length === 0) {
    return (
      <EmptyState
        icon="ChartNoAxesCombined"
        title={t('products.history.emptyLocation')}
        description={t('products.history.emptyDesc')}
      />
    );
  }

  // 4. Data — sorted chronologically (oldest first), newest dot is primary
  const sorted = [...entries].sort(
    (a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime(),
  );

  return (
    <div
      className="rounded-md border border-outline-variant bg-surface-container p-md"
      role="list"
      aria-label={t('products.history.locationTimeline')}
    >
      <ol className="relative ml-3 border-l-2 border-outline-variant">
        {sorted.map((entry, index) => {
          const isLatest = index === sorted.length - 1;
          return (
            <li key={entry.updatedAt} className="relative pb-lg pl-lg last:pb-0" role="listitem">
              {/* Timeline dot */}
              <span
                className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 ${
                  isLatest
                    ? 'border-primary bg-primary'
                    : 'border-outline-variant bg-surface-container'
                }`}
                aria-hidden="true"
              />
              {/* Content */}
              <div className="flex flex-col">
                <span className="text-body-sm font-medium text-on-surface">
                  {formatLocation(entry)}
                </span>
                <span className="text-label-xs font-mono text-on-surface-variant">
                  {formatDate(entry.updatedAt)}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export const EventTimeline = memo(EventTimelineInner);
