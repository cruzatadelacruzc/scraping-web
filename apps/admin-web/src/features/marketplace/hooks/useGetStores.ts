import { useQuery } from '@tanstack/react-query';

import { mapStoreDTOToViewModel } from '../mappers/store-mapper';
import { storesService } from '../services/stores-service';
import type { StoreViewModel } from '../view-models/store-view-model';

import { marketplaceKeys } from './query-keys';

/**
 * Fetches all registered stores. Stores are registered at bootstrap and
 * effectively static, so staleTime is the static tier (30 min).
 */
export function useGetStores(): {
  data: StoreViewModel[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
} {
  const result = useQuery({
    queryKey: marketplaceKeys.stores.all,
    queryFn: async ({ signal }) => {
      const response = await storesService.list(signal);
      const { stores } = response.data;
      return stores.map(mapStoreDTOToViewModel);
    },
    staleTime: 30 * 60 * 1000, // static tier
    placeholderData: (prev) => prev,
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => {
      void result.refetch();
    },
    isFetching: result.isFetching,
  };
}
