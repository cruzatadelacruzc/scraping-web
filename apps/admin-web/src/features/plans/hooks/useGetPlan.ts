import { useQuery } from '@tanstack/react-query';

import { mapPlanDTOToViewModel } from '../mappers/plan-mapper';
import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useGetPlan(id: string | null) {
  return useQuery({
    queryKey: planKeys.detail(id ?? ''),
    queryFn: async () => {
      if (id === null) {
        throw new Error('useGetPlan called with null id');
      }
      const { data } = await plansService.getById(id);
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime shape may be { plan: PlanDTO } or PlanDTO directly
      const plan = (data as unknown as { plan: typeof data }).plan ?? data;
      return mapPlanDTOToViewModel(plan);
    },
    enabled: id !== null,
    staleTime: 30 * 60 * 1000,
  });
}
