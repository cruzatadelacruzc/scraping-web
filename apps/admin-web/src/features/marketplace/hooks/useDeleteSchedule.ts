import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { schedulesService } from '../services/schedules-service';

import { marketplaceKeys } from './query-keys';

/**
 * Deletes a scraping schedule.
 * On success: invalidates all schedules and shows a success toast.
 * NEVER optimistic — waits for server response.
 */
export function useDeleteSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => schedulesService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.all });
      toast.success('Schedule permanently deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
