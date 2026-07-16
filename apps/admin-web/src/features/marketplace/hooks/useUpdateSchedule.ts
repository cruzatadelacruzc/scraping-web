import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { UpdateSchedulePayload } from '../services/schedules-service';
import { schedulesService } from '../services/schedules-service';

import { showRetryToast } from './mutation-toast';
import { marketplaceKeys } from './query-keys';

/**
 * Updates an existing scraping schedule.
 * On success: invalidates list + detail and shows a success toast.
 * On error: sticky error toast with Retry action.
 */
export function useUpdateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSchedulePayload }) =>
      schedulesService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.list() });
      void queryClient.invalidateQueries({
        queryKey: marketplaceKeys.schedules.detail(variables.id),
      });
      toast.success('Schedule updated');
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
