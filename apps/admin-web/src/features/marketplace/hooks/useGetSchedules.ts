import { useQuery } from '@tanstack/react-query';

import { mapScheduleDTOToViewModel } from '../mappers/schedule-mapper';
import { schedulesService } from '../services/schedules-service';
import type { ScheduleListViewModel } from '../view-models/schedule-view-model';

import { marketplaceKeys } from './query-keys';

/**
 * Fetches all scraping schedules for the schedules table.
 * Standard staleTime (5 min).
 */
export function useGetSchedules(): {
  data: ScheduleListViewModel[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
} {
  const result = useQuery({
    queryKey: marketplaceKeys.schedules.list(),
    queryFn: async ({ signal }) => {
      const response = await schedulesService.list(signal);
      const { schedules } = response.data;
      return schedules.map(mapScheduleDTOToViewModel);
    },
    staleTime: 5 * 60 * 1000, // standard tier
    placeholderData: (prev) => prev,
  });

  return {
    data: result.data,
    isLoading: result.isLoading,
    isError: result.isError,
    error: result.error,
    refetch: () => {
      void result.refetch();
    },
    isFetching: result.isFetching,
  };
}
