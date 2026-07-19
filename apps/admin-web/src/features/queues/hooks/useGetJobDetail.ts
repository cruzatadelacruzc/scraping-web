import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapJobDTOToDetail } from '../mappers/queue-mapper';
import { queuesService } from '../services/queues-service';

import { queueKeys } from './query-keys';

/**
 * Fetches the full detail of a single job for the drawer.
 * Disabled until both the queue and the job are selected.
 */
export function useGetJobDetail(queueName: string | null, jobId: string | null) {
  return useQuery({
    queryKey: queueKeys.job(queueName ?? '', jobId ?? ''),
    enabled: queueName !== null && jobId !== null,
    queryFn: async ({ signal }) => {
      if (queueName === null || jobId === null) throw new Error('queueName and jobId required');
      const response = await queuesService.getJob(queueName, jobId, { signal });
      return mapJobDTOToDetail(response.data);
    },
    staleTime: ENV.STALE_TIME_REALTIME,
  });
}
