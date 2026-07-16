import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CreateScraperConfigPayload } from '../services/revolico-service';
import { revolicoService } from '../services/revolico-service';

import { marketplaceKeys } from './query-keys';

/**
 * Creates a new scraper config.
 * On success: invalidates configs list and shows 4s success toast.
 * On error: sticky error toast with Retry action.
 */
export function useCreateScraperConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateScraperConfigPayload) => revolicoService.createConfig(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.revolico.configs.all,
      });
      toast.success('Scraper config saved');
    },
    onError: (error: Error) => {
      toast.error(error.message, {
        duration: Infinity,
        action: {
          label: 'Retry',
          // eslint-disable-next-line @typescript-eslint/no-empty-function
          onClick: () => {},
        },
      });
    },
  });
}
