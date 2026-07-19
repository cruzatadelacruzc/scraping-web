import { ENV } from '@shared/config/env';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { mapJobDTOToListItem } from '../mappers/queue-mapper';
import { queuesService } from '../services/queues-service';
import type { JobStatus } from '../view-models/queue-view-model';

import { queueKeys } from './query-keys';

const JOBS_LIMIT = 20;

/**
 * Fetches recent jobs for a queue, optionally filtered by status.
 * Disabled until a queue is selected; keeps previous rows while refetching.
 */
export function useGetQueueJobs(queueName: string | null, status: JobStatus | 'all') {
  return useQuery({
    queryKey: queueKeys.jobs(queueName ?? '', { status }),
    enabled: queueName !== null,
    queryFn: async ({ signal }) => {
      if (queueName === null) throw new Error('queueName is required');
      const response = await queuesService.listJobs(queueName, {
        limit: JOBS_LIMIT,
        status: status === 'all' ? undefined : status,
        signal,
      });
      return response.data.jobs.map(mapJobDTOToListItem);
    },
    staleTime: ENV.STALE_TIME_REALTIME,
    placeholderData: keepPreviousData,
  });
}
