import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';

import { mapProductDTOToViewModel } from '../mappers/product-mapper';
import { productsService } from '../services/products-service';

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
  return usePaginatedQuery({
    page: params.page,
    limit: params.limit,
    filters: {
      search: params.search ?? '',
      category: params.category ?? '',
      ...(params.minPrice !== undefined && { minPrice: params.minPrice }),
      ...(params.maxPrice !== undefined && { maxPrice: params.maxPrice }),
      ...(params.isOutstanding !== undefined && { isOutstanding: params.isOutstanding }),
      ...(params.isPromoted !== undefined && { isPromoted: params.isPromoted }),
    },
    queryKeyBase: 'products',
    placeholderData: true,
    queryFn: ({ skip, limit, signal }) =>
      productsService
        .list({
          skip,
          limit,
          search: params.search,
          category: params.category,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          isOutstanding: params.isOutstanding,
          isPromoted: params.isPromoted,
          signal,
        })
        .then((res) => ({
          items: res.data.data.map(mapProductDTOToViewModel),
          total: res.data.meta.total,
        })),
  });
}
