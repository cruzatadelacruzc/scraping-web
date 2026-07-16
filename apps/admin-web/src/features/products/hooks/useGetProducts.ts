import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapProductDTOToViewModel } from '../mappers/product-mapper';
import { productsService } from '../services/products-service';

import { productKeys } from './query-keys';

export interface UseGetProductsParams {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isOutstanding?: boolean;
  isPromoted?: boolean;
}

export function useGetProducts(params: UseGetProductsParams) {
  const skip = (params.page - 1) * params.limit;
  const filters: Record<string, unknown> = {
    page: params.page,
    limit: params.limit,
    search: params.search ?? '',
    category: params.category ?? '',
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    isOutstanding: params.isOutstanding,
    isPromoted: params.isPromoted,
  };

  return useQuery({
    queryKey: productKeys.list(filters),
    queryFn: async ({ signal }) => {
      const response = await productsService.list({
        skip,
        limit: params.limit,
        search: params.search,
        category: params.category,
        minPrice: params.minPrice,
        maxPrice: params.maxPrice,
        isOutstanding: params.isOutstanding,
        isPromoted: params.isPromoted,
        signal,
      });
      return {
        items: response.data.data.map(mapProductDTOToViewModel),
        total: response.data.meta.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
    placeholderData: (prev) => prev,
  });
}
