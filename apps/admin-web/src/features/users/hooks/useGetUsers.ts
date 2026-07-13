import { useQuery } from '@tanstack/react-query';
import { ENV } from '@shared/config/env';
import { usersService } from '../services/users-service';
import { mapUserDTOToViewModel } from '../mappers/user-mapper';
import type { UserViewModel } from '../view-models/user-view-model';

export function useGetUsers(params: { page: number; limit: number }) {
  const skip = (params.page - 1) * params.limit;

  return useQuery({
    queryKey: ['users', params],
    queryFn: async ({ signal }) => {
      const response = await usersService.list({ skip, limit: params.limit, signal });
      return {
        items: response.data.users.map(mapUserDTOToViewModel) as UserViewModel[],
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}
