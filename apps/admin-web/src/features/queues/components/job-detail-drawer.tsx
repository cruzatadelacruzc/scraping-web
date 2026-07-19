import { useTranslation } from 'react-i18next';
import { Drawer } from '@shared/ui/drawer';

import { useGetJobDetail } from '../hooks/useGetJobDetail';

import { QueueBadge } from './queue-badge';

interface Props {
  queueName: string | null;
  jobId: string | null;
  onClose: () => void;
}

export function JobDetailDrawer({ queueName, jobId, onClose }: Props): JSX.Element {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useGetJobDetail(queueName, jobId);

  return (
    <Drawer
      open={jobId !== null}
      title={t('queues.drawer.title', 'Job detail')}
      onClose={onClose}
      widthClass="w-[480px]"
    >
      {isLoading && (
        <div className="space-y-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-6 animate-pulse rounded-sm bg-surface-container-highest" />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-danger bg-danger-muted p-md text-sm text-danger">
          {t('queues.drawer.error', 'Failed to load job detail')}
        </div>
      )}

      {data && (
        <>
          <dl className="space-y-md">
            <div>
              <dt className="text-label-xs font-mono text-on-surface-variant">
                {t('queues.jobs.name', 'Name')}
              </dt>
              <dd className="mt-xs font-mono text-body-md text-on-surface">{data.name}</dd>
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.jobs.status', 'Status')}
                </dt>
                <dd className="mt-xs">
                  <QueueBadge label={data.status} variant={data.statusVariant} />
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.jobs.attempts', 'Attempts')}
                </dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.attemptsMade}</dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.drawer.createdAt', 'Created at')}
                </dt>
                <dd className="mt-xs text-body-sm text-on-surface">
                  {data.createdAt ? data.createdAt.toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.drawer.processedAt', 'Processed at')}
                </dt>
                <dd className="mt-xs text-body-sm text-on-surface">
                  {data.processedAt ? data.processedAt.toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.drawer.finishedAt', 'Finished at')}
                </dt>
                <dd className="mt-xs text-body-sm text-on-surface">
                  {data.finishedAt ? data.finishedAt.toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.jobs.duration', 'Duration')}
                </dt>
                <dd className="mt-xs font-mono text-body-sm text-on-surface">
                  {data.durationMs !== null ? `${(data.durationMs / 1000).toFixed(1)}s` : '—'}
                </dd>
              </div>
            </div>
            {data.progressPercent !== null && (
              <div>
                <dt className="text-label-xs font-mono text-on-surface-variant">
                  {t('queues.drawer.progress', 'Progress')}
                </dt>
                <dd className="mt-xs text-body-md text-on-surface">{data.progressPercent}%</dd>
              </div>
            )}
          </dl>

          {data.failedReason !== null && (
            <div className="mt-md rounded-md border border-danger bg-danger-muted p-md">
              <h3 className="text-label-xs font-mono text-danger">
                {t('queues.jobs.failedReason', 'Failure reason')}
              </h3>
              <p className="mt-xs text-body-sm text-danger">{data.failedReason}</p>
            </div>
          )}

          <div className="mt-md">
            <h3 className="text-label-xs font-mono text-on-surface-variant">
              {t('queues.drawer.payload', 'Payload')}
            </h3>
            <pre className="mt-xs max-h-64 overflow-auto rounded-md bg-surface-container-lowest p-sm font-mono text-body-sm text-on-surface">
              {data.payloadJson ?? t('queues.drawer.none', '—')}
            </pre>
          </div>

          <div className="mt-md">
            <h3 className="text-label-xs font-mono text-on-surface-variant">
              {t('queues.drawer.returnValue', 'Return value')}
            </h3>
            <pre className="mt-xs max-h-64 overflow-auto rounded-md bg-surface-container-lowest p-sm font-mono text-body-sm text-on-surface">
              {data.returnValueJson ?? t('queues.drawer.none', '—')}
            </pre>
          </div>
        </>
      )}
    </Drawer>
  );
}
