import { useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { schedulesService } from '../services/schedules-service';
import type { ScheduleListViewModel } from '../view-models/schedule-view-model';

import { showRetryToast } from './mutation-toast';
import { marketplaceKeys } from './query-keys';

/**
 * Toggles the enabled flag of a scraping schedule.
 * OPTIMISTIC: flips the enabled flag immediately, rolls back on error.
 * On error: sticky error toast with Retry action.
 */
export function useToggleSchedule() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => schedulesService.toggle(id),
    onMutate: async (id: string) => {
      // Cancel any in-flight list queries so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: marketplaceKeys.schedules.list() });

      // Snapshot previous data for rollback
      const previousData = queryClient.getQueryData<ScheduleListViewModel[]>(
        marketplaceKeys.schedules.list(),
      );

      // Optimistically flip the enabled flag
      queryClient.setQueryData<ScheduleListViewModel[]>(marketplaceKeys.schedules.list(), (old) =>
        old?.map((schedule) =>
          schedule.id === id ? { ...schedule, enabled: !schedule.enabled } : schedule,
        ),
      );

      return { previousData };
    },
    onError: (error: Error, _id, context) => {
      // Rollback to previous state
      if (context?.previousData) {
        queryClient.setQueryData(marketplaceKeys.schedules.list(), context.previousData);
      }
      showRetryToast(error, () => {
        mutateRef.current(_id);
      });
    },
    onSettled: () => {
      // Always refetch to ensure server state matches
      void queryClient.invalidateQueries({ queryKey: marketplaceKeys.schedules.list() });
    },
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  return mutation;
}
