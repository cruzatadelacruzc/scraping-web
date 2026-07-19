import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapQueueStatsDTOToViewModel } from '../mappers/queue-mapper';
import { queuesService } from '../services/queues-service';

import { queueKeys } from './query-keys';

/**
 * Fetches job counts for every registered queue.
 * Stale time: REALTIME (30s) with background refetch on the same interval.
 */
export function useGetQueues() {
  return useQuery({
    queryKey: queueKeys.stats(),
    queryFn: async ({ signal }) => {
      const response = await queuesService.listStats({ signal });
      return response.data.queues.map(mapQueueStatsDTOToViewModel);
    },
    staleTime: ENV.STALE_TIME_REALTIME,
    refetchInterval: ENV.STALE_TIME_REALTIME,
  });
}
