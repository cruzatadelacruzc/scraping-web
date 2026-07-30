import { useRef } from 'react';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { CreateSchedulePayload } from '../services/schedules-service';
import { schedulesService } from '../services/schedules-service';

import { marketplaceKeys } from './query-keys';

/**
 * Creates a new scraping schedule.
 * On success: invalidates schedules list and shows a success toast.
 * On error: sticky error toast with Retry action.
 */
export function useCreateSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: CreateSchedulePayload) => schedulesService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.all });
      toast.success('Schedule created');
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
