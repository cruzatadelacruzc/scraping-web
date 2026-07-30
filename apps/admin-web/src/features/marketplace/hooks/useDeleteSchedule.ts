import { useRef } from 'react';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { schedulesService } from '../services/schedules-service';

import { marketplaceKeys } from './query-keys';

/**
 * Deletes a scraping schedule.
 * On success: invalidates all schedules and shows a success toast.
 * On error: sticky error toast with Retry action.
 * NEVER optimistic — waits for server response.
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => schedulesService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.all });
      toast.success('Schedule permanently deleted');
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
