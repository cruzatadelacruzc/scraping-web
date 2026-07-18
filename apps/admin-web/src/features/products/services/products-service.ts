import { apiClient } from '@shared/api/client';

export interface ProductDTO {
  _id: string;
  ID?: string;
  category: string;
  subcategory?: string;
  url: string;
  description?: string;
  cost: string;
  currency: string;
  price: number;
  imageURL?: string;
  isOutstanding: boolean;
  isPromoted?: boolean;
  location?: { state?: string; municipality?: string };
  views?: number;
  seller?: { name?: string };
  createdAt: string;
  updatedAt: string;
  hasEnrichment: boolean;
  hasAttributes: boolean;
  hasAnalytics: boolean;
  tags: string[];
}

export interface ProductMeta {
  total: number;
  skip: number;
  limit: number;
  hasMore: boolean;
}

export interface ProductListResponse {
  data: ProductDTO[];
  meta: ProductMeta;
}

export interface ProductListParams {
  skip: number;
  limit: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  isOutstanding?: boolean;
  isPromoted?: boolean;
  signal?: AbortSignal;
}

export const productsService = {
  list(params: ProductListParams) {
    const { signal, ...queryParams } = params;
    return apiClient.get<ProductListResponse>('/admin/products', { params: queryParams, signal });
  },
};
