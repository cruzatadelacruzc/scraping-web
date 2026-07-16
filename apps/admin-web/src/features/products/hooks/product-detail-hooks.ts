import { useQuery } from '@tanstack/react-query';

import { mapProductDetailDTOToViewModel } from '../mappers/product-history-mapper';
import { productHistoryService } from '../services/product-history-service';

import { productKeys } from './query-keys';

export function useGetProduct(id: string) {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getDetail(id, signal);
      return mapProductDetailDTOToViewModel(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
