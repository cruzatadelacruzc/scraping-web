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
      return data;
    },
    enabled: id !== null,
    staleTime: 30 * 60 * 1000,
  });
}
