import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapProductStatsDTOToViewModel } from '../mappers/product-stats-mapper';
import { productsStatsService } from '../services/products-stats-service';

import { productKeys } from './query-keys';

export function useGetProductStats() {
  return useQuery({
    queryKey: productKeys.stats(),
    queryFn: async ({ signal }) => {
      const response = await productsStatsService.getStats(signal);
      return mapProductStatsDTOToViewModel(response.data);
    },
    staleTime: ENV.STALE_TIME_STANDARD,
    placeholderData: (prev) => prev,
  });
}
