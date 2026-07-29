import { useQuery } from '@tanstack/react-query';

import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useGetPlanSubscribers(id: string | null) {
  return useQuery({
    queryKey: planKeys.subscribers(id ?? ''),
    queryFn: async () => {
      if (id === null) {
        throw new Error('useGetPlanSubscribers called with null id');
      }
      const { data } = await plansService.getSubscribers(id);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime shape may be { subscribers: [...] } or [...] directly
      const subscribers = (data as unknown as { subscribers: typeof data }).subscribers ?? data;
      return subscribers;
    },
    enabled: id !== null,
    staleTime: 30 * 60 * 1000,
  });
}
