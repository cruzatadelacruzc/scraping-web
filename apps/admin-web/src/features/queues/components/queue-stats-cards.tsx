import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Inbox } from 'lucide-react';

import { useGetQueues } from '../hooks/useGetQueues';
import type { QueueStatsViewModel } from '../view-models/queue-view-model';

import { QueueBadge } from './queue-badge';

interface Props {
  selected: string | null;
  onSelect: (name: string) => void;
}

export function QueueStatsCards({ selected, onSelect }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError, refetch, isFetching } = useGetQueues();

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-md bg-surface-container-highest" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-danger bg-danger-muted p-md">
        <p className="text-body-sm text-danger">
          {t('queues.cards.error', 'Failed to load queue stats')}
        </p>
        <button
          onClick={handleRetry}
          className="mt-sm rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-on-primary"
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-md border border-outline-variant bg-surface-container p-lg text-center">
        <Inbox size={48} className="text-on-surface-variant" aria-hidden="true" />
        <h2 className="mt-sm text-lg text-on-surface">
          {t('queues.cards.empty.title', 'No queues registered')}
        </h2>
        <p className="mt-xs text-body-sm text-on-surface-variant">
          {t(
            'queues.cards.empty.description',
            'Queues appear here once the backend registers them.',
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      {isFetching && <div className="h-0.5 animate-pulse bg-primary/20" />}
      <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-3">
        {data.map((queue) => (
          <QueueCard
            key={queue.name}
            queue={queue}
            selected={selected === queue.name}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

interface QueueCardProps {
  queue: QueueStatsViewModel;
  selected: boolean;
  onSelect: (name: string) => void;
}

function QueueCard({ queue, selected, onSelect }: QueueCardProps): JSX.Element {
  const { t } = useTranslation();
  const handleClick = useCallback(() => {
    onSelect(queue.name);
  }, [onSelect, queue.name]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      className={`rounded-md border p-md text-left transition-colors ${
        selected
          ? 'border-primary bg-surface-container-high'
          : 'border-outline-variant bg-surface-container hover:bg-surface-container-high'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-body-sm text-on-surface">{queue.name}</span>
        <span className="text-label-xs font-mono text-on-surface-variant">
          {queue.total} {t('queues.cards.total', 'total')}
        </span>
      </div>
      <div className="mt-sm flex flex-wrap gap-xs">
        {queue.counts.map((c) => (
          <QueueBadge key={c.label} label={c.label} count={c.count} variant={c.variant} />
        ))}
      </div>
    </button>
  );
}
