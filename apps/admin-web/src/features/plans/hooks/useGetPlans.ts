import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';

import { mapPlanDTOToPlanListViewModel } from '../mappers/plan-mapper';
import { plansService } from '../services/plans-service';

interface Params {
  page: number;
  limit: number;
  search?: string;
}

export function useGetPlans(params: Params) {
  return usePaginatedQuery({
    page: params.page,
    limit: params.limit,
    filters: {
      search: params.search ?? '',
    },
    queryKeyBase: 'plans',
    queryFn: ({ skip, limit, signal }) =>
      plansService.list({ skip, limit, search: params.search, signal }).then((res) => {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime safety: backend may omit fields
        const allPlans = res.data?.plans ?? [];
        return {
          items: allPlans.slice(skip, skip + limit).map(mapPlanDTOToPlanListViewModel),
          total: allPlans.length,
        };
      }),
    placeholderData: true,
    staleTime: 30 * 60 * 1000,
  });
}
