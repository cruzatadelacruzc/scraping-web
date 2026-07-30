import { useRef } from 'react';
import { showRetryToast } from '@shared/ui/mutation-toast';
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

  const mutation = useMutation({
    mutationFn: (data: CreateScraperConfigPayload) => revolicoService.createConfig(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.revolico.configs.all,
      });
      toast.success('Scraper config saved');
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
