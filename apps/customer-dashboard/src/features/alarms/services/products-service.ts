import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import type {
  ProductCatalogItem,
  ProductCategoryGroup,
  ProductPage,
  ProductSearchParams,
} from '../types';

interface RawPage {
  data: ProductCatalogItem[];
  meta: { total: number; skip: number; limit: number; hasMore: boolean };
}

export const productsService = {
  async search(params: ProductSearchParams, signal?: AbortSignal): Promise<ProductPage> {
    const res = await apiClient.get<RawPage>(ENDPOINTS.PRODUCTS.LIST, { params, signal });
    const { data, meta } = res.data;
    return { items: data, ...meta };
  },

  async categories(signal?: AbortSignal): Promise<ProductCategoryGroup[]> {
    const res = await apiClient.get<ProductCategoryGroup[]>(ENDPOINTS.PRODUCTS.CATEGORIES, {
      signal,
    });
    return res.data;
  },
};
