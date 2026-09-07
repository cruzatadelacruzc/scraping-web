import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { ProductSearchParams } from '../types';
import { productsService } from '../services/products-service';
import { productKeys } from './query-keys';

export function useProductSearch(params: ProductSearchParams, enabled = true) {
  return useQuery({
    queryKey: productKeys.search(params),
    queryFn: ({ signal }) => productsService.search(params, signal),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: ({ signal }) => productsService.categories(signal),
    staleTime: 30 * 60 * 1000,
  });
}
