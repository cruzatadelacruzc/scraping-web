import { useQuery } from '@tanstack/react-query';

import {
  mapLocationHistoryResponse,
  mapNumericHistoryResponse,
  mapStatusHistoryResponse,
} from '../mappers/product-history-mapper';
import { productHistoryService } from '../services/product-history-service';

import { productKeys } from './query-keys';

export function useGetPriceHistory(id: string) {
  return useQuery({
    queryKey: productKeys.priceHistory(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getPriceHistory(id, signal);
      return mapNumericHistoryResponse(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useGetViewsHistory(id: string) {
  return useQuery({
    queryKey: productKeys.viewsHistory(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getViewsHistory(id, signal);
      return mapNumericHistoryResponse(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useGetLocationHistory(id: string) {
  return useQuery({
    queryKey: productKeys.locationHistory(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getLocationHistory(id, signal);
      return mapLocationHistoryResponse(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useGetOutstandingHistory(id: string) {
  return useQuery({
    queryKey: productKeys.outstandingHistory(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getOutstandingHistory(id, signal);
      return mapStatusHistoryResponse(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

export function useGetPromotedHistory(id: string) {
  return useQuery({
    queryKey: productKeys.promotedHistory(id),
    queryFn: async ({ signal }) => {
      const response = await productHistoryService.getPromotedHistory(id, signal);
      return mapStatusHistoryResponse(response.data);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}
