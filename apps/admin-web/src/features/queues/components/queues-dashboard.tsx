import { useCallback, useState } from 'react';

import { JobDetailDrawer } from './job-detail-drawer';
import { QueueJobsTable } from './queue-jobs-table';
import { QueueStatsCards } from './queue-stats-cards';

/** Queues operations dashboard: stats cards → jobs table → job detail drawer. */
export function QueuesDashboard(): JSX.Element {
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const handleSelectQueue = useCallback((name: string) => {
    setSelectedQueue(name);
    setSelectedJobId(null);
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setSelectedJobId(null);
  }, []);

  return (
    <div className="space-y-lg">
      <QueueStatsCards selected={selectedQueue} onSelect={handleSelectQueue} />
      <QueueJobsTable queueName={selectedQueue} onSelectJob={setSelectedJobId} />
      <JobDetailDrawer
        queueName={selectedQueue}
        jobId={selectedJobId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
}
