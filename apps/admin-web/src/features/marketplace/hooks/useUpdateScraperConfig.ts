import { useRef } from 'react';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { UpdateScraperConfigPayload } from '../services/revolico-service';
import { revolicoService } from '../services/revolico-service';

import { marketplaceKeys } from './query-keys';

/**
 * Updates an existing scraper config.
 * On success: invalidates configs list + detail and shows 4s success toast.
 * On error: sticky error toast with Retry action.
 */
export function useUpdateScraperConfig() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ storeKey, data }: { storeKey: string; data: UpdateScraperConfigPayload }) =>
      revolicoService.updateConfig(storeKey, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.revolico.configs.all,
      });
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.revolico.configs.detail(variables.storeKey),
      });
      toast.success('Scraper config updated');
    },
    onError: (error: Error, variables) => {
      showRetryToast(error, () => {
        mutateRef.current(variables);
      });
    },
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  return mutation;
}
