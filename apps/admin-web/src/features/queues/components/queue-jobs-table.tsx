import { type ChangeEvent, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileStack } from 'lucide-react';

import { useGetQueueJobs } from '../hooks/useGetQueueJobs';
import type { JobListItemViewModel } from '../view-models/queue-view-model';

import { QueueBadge } from './queue-badge';

const STATUS_FILTERS = ['all', 'waiting', 'active', 'completed', 'failed', 'delayed'] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface Props {
  queueName: string | null;
  onSelectJob: (id: string) => void;
}

function formatDurationMs(ms: number | null): string {
  if (ms === null) return '—';
  if (ms < 1000) return `${String(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function QueueJobsTable({ queueName, onSelectJob }: Props): JSX.Element {
  const { t } = useTranslation();
  const [status, setStatus] = useState<StatusFilter>('all');
  const { data, isLoading, isError, refetch, isFetching } = useGetQueueJobs(queueName, status);

  const handleStatusChange = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    setStatus(e.target.value as StatusFilter);
  }, []);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (queueName === null) {
    return (
      <p className="rounded-md border border-outline-variant bg-surface-container p-md text-body-sm text-on-surface-variant">
        {t('queues.jobs.hint', 'Select a queue to inspect its recent jobs.')}
      </p>
    );
  }

  return (
    <div className="rounded-md border border-outline-variant bg-surface-container">
      <div className="flex items-center justify-between border-b border-outline-variant p-sm">
        <span className="font-mono text-body-sm text-on-surface">{queueName}</span>
        <label className="flex items-center gap-xs text-label-xs font-mono text-on-surface-variant">
          {t('queues.jobs.filterLabel', 'Status')}
          <select
            value={status}
            onChange={handleStatusChange}
            className="rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-on-surface"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? t('queues.jobs.all', 'All statuses') : s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isFetching && !isLoading && <div className="h-0.5 animate-pulse bg-primary/20" />}

      {isLoading && (
        <div className="space-y-sm p-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-sm bg-surface-container-highest" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-md">
          <p className="text-body-sm text-danger">
            {t('queues.jobs.error', 'Failed to load jobs')}
          </p>
          <button
            onClick={handleRetry}
            className="mt-sm rounded-sm bg-primary px-sm py-xs text-body-sm font-medium text-on-primary"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      )}

      {data && data.length === 0 && (
        <div className="flex flex-col items-center p-lg text-center">
          <FileStack size={48} className="text-on-surface-variant" aria-hidden="true" />
          <h2 className="mt-sm text-lg text-on-surface">
            {t('queues.jobs.empty.title', 'No jobs')}
          </h2>
          <p className="mt-xs text-body-sm text-on-surface-variant">
            {t('queues.jobs.empty.description', 'No recent jobs match the current filter.')}
          </p>
        </div>
      )}

      {data && data.length > 0 && (
        <table className="w-full border-collapse text-body-sm">
          <caption className="sr-only">
            {t('queues.jobs.caption', 'Recent jobs for the selected queue')}
          </caption>
          <thead>
            <tr className="text-left text-label-xs font-mono text-on-surface-variant">
              <th className="px-sm py-xs font-medium">{t('queues.jobs.id', 'Job ID')}</th>
              <th className="px-sm py-xs font-medium">{t('queues.jobs.name', 'Name')}</th>
              <th className="px-sm py-xs font-medium">{t('queues.jobs.status', 'Status')}</th>
              <th className="px-sm py-xs font-medium">{t('queues.jobs.attempts', 'Attempts')}</th>
              <th className="px-sm py-xs font-medium">{t('queues.jobs.created', 'Created')}</th>
              <th className="px-sm py-xs font-medium">{t('queues.jobs.duration', 'Duration')}</th>
              <th className="px-sm py-xs font-medium">
                {t('queues.jobs.failedReason', 'Failure reason')}
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((job) => (
              <JobRow key={job.id} job={job} onSelectJob={onSelectJob} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

interface JobRowProps {
  job: JobListItemViewModel;
  onSelectJob: (id: string) => void;
}

function JobRow({ job, onSelectJob }: JobRowProps): JSX.Element {
  const handleClick = useCallback(() => {
    onSelectJob(job.id);
  }, [onSelectJob, job.id]);

  return (
    <tr className="h-9 border-t border-outline-variant hover:bg-surface-container-high">
      <td className="px-sm">
        <button
          type="button"
          onClick={handleClick}
          className="font-mono text-primary hover:underline"
        >
          {job.id}
        </button>
      </td>
      <td className="px-sm text-on-surface">{job.name}</td>
      <td className="px-sm">
        <QueueBadge label={job.status} variant={job.statusVariant} />
      </td>
      <td className="px-sm text-on-surface-variant">{job.attemptsMade}</td>
      <td className="px-sm text-on-surface-variant">
        {job.createdAt ? job.createdAt.toLocaleString() : '—'}
      </td>
      <td className="px-sm font-mono text-on-surface-variant">
        {formatDurationMs(job.durationMs)}
      </td>
      <td
        className="max-w-[240px] truncate px-sm text-danger"
        title={job.failedReason ?? undefined}
      >
        {job.failedReason ?? ''}
      </td>
    </tr>
  );
}
