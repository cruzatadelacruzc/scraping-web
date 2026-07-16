import { useQuery } from '@tanstack/react-query';

import { mapScraperConfigDTOToViewModel } from '../mappers/revolico-mapper';
import { revolicoService } from '../services/revolico-service';
import type { ScraperConfigViewModel } from '../view-models/revolico-view-model';

import { marketplaceKeys } from './query-keys';

/**
 * Fetches all Revolico scraper configs.
 * Standard stale time (5 min).
 */
export function useGetScraperConfigs() {
  return useQuery({
    queryKey: marketplaceKeys.revolico.configs.list(),
    queryFn: async ({ signal }) => {
      const response = await revolicoService.listConfigs(signal);
      return response.data.configs.map(mapScraperConfigDTOToViewModel);
    },
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Fetches a single Revolico scraper config by storeKey.
 * Returns undefined when loading, null when config does not exist (404).
 * Query is disabled when storeKey is empty.
 * Standard stale time (5 min).
 */
export function useGetScraperConfig(
  storeKey: string,
): ReturnType<typeof useQuery<ScraperConfigViewModel | null | undefined>> {
  return useQuery({
    queryKey: marketplaceKeys.revolico.configs.detail(storeKey),
    queryFn: async ({ signal }): Promise<ScraperConfigViewModel | null> => {
      try {
        const response = await revolicoService.getConfig(storeKey, signal);
        return mapScraperConfigDTOToViewModel(response.data.config);
      } catch (err) {
        // 404 means no existing config → return null
        if (
          typeof err === 'object' &&
          err !== null &&
          'response' in err &&
          (err as { response: { status: number } }).response.status === 404
        ) {
          return null;
        }
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    enabled: storeKey.length > 0,
    placeholderData: (prev) => prev,
  });
}
