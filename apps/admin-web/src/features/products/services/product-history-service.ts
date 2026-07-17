import { apiClient } from '@shared/api/client';

// ── DTO Types ────────────────────────────────────────────────────────────

export interface ProductDetailDTO {
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
  seller?: { name?: string; phone?: string; email?: string; whatsapp?: string };
  createdAt: string;
  updatedAt: string;
  attributes?: Record<string, unknown>;
  analytics?: Record<string, unknown>;
  enrichmentHash?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface NumericHistoryEntryDTO {
  value: number;
  updatedAt: string;
}

export interface LocationHistoryEntryDTO {
  location: { state: string; municipality?: string };
  updatedAt: string;
}

export interface StatusHistoryEntryDTO {
  value: 0 | 1;
  updatedAt: string;
}

export interface HistoryResponseDTO<T> {
  data: T[];
  total: number;
}

// ── Service ───────────────────────────────────────────────────────────────

export const productHistoryService = {
  getDetail(id: string, signal?: AbortSignal) {
    return apiClient.get<ProductDetailDTO>(`/admin/products/${id}`, { signal });
  },

  getPriceHistory(id: string, signal?: AbortSignal) {
    return apiClient.get<HistoryResponseDTO<NumericHistoryEntryDTO>>(
      `/admin/products/${id}/history/price`,
      { signal },
    );
  },

  getViewsHistory(id: string, signal?: AbortSignal) {
    return apiClient.get<HistoryResponseDTO<NumericHistoryEntryDTO>>(
      `/admin/products/${id}/history/views`,
      { signal },
    );
  },

  getLocationHistory(id: string, signal?: AbortSignal) {
    return apiClient.get<HistoryResponseDTO<LocationHistoryEntryDTO>>(
      `/admin/products/${id}/history/location`,
      { signal },
    );
  },

  getOutstandingHistory(id: string, signal?: AbortSignal) {
    return apiClient.get<HistoryResponseDTO<StatusHistoryEntryDTO>>(
      `/admin/products/${id}/history/outstanding`,
      { signal },
    );
  },

  getPromotedHistory(id: string, signal?: AbortSignal) {
    return apiClient.get<HistoryResponseDTO<StatusHistoryEntryDTO>>(
      `/admin/products/${id}/history/promoted`,
      { signal },
    );
  },
};
