import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapUserDTOToViewModel } from '../mappers/user-mapper';
import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

interface UseGetUsersParams {
  page: number;
  limit: number;
  search?: string;
}

export function useGetUsers(params: UseGetUsersParams) {
  const skip = (params.page - 1) * params.limit;

  return useQuery({
    queryKey: userKeys.list({ page: params.page, limit: params.limit, search: params.search ?? '' }),
    queryFn: async ({ signal }) => {
      const response = await usersService.list({
        skip,
        limit: params.limit,
        search: params.search,
        signal,
      });
      return {
        items: response.data.users.map(mapUserDTOToViewModel),
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}
