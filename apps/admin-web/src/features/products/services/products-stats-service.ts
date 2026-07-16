import { apiClient } from '@shared/api/client';

export interface ProductStatsDTO {
  totalProducts: number;
  byCategory: { category: string; count: number }[];
  byState: { state: string; count: number }[];
  outstandingCount: number;
  promotedCount: number;
  lastScrapedAt: string | null;
  priceRange: { min: number; max: number };
  enrichedCount: number;
  unenrichedCount: number;
}

export const productsStatsService = {
  getStats(signal?: AbortSignal) {
    return apiClient.get<ProductStatsDTO>('/admin/products/stats', { signal });
  },
};
