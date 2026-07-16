import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { UpdateSchedulePayload } from '../services/schedules-service';
import { schedulesService } from '../services/schedules-service';

import { marketplaceKeys } from './query-keys';

/**
 * Updates an existing scraping schedule.
 * On success: invalidates list + detail and shows a success toast.
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSchedulePayload }) =>
      schedulesService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.list() });
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.schedules.detail(variables.id),
      });
      toast.success('Schedule updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
