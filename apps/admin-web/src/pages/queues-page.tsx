import { useTranslation } from 'react-i18next';
import { QueuesDashboard } from '@features/queues';

export function QueuesPage(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-md">
      <div>
        <h1 className="text-headline-lg text-on-surface">{t('nav.queues', 'Queues')}</h1>
        <p className="mt-xs text-body-md text-on-surface-variant">
          {t('queues.description', 'Monitor BullMQ queues: job counts, recent jobs and failures.')}
        </p>
      </div>
      <QueuesDashboard />
    </div>
  );
}
