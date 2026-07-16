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

  return useMutation({
    mutationFn: (data: CreateSchedulePayload) => schedulesService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.all });
      toast.success('Schedule created');
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
