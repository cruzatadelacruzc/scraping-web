import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapRoleDTOToViewModel } from '../mappers/user-mapper';
import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

export function useGetRoles() {
  return useQuery({
    queryKey: userKeys.roles,
    queryFn: async () => {
      const { data } = await usersService.getRoles();
      return data.roles.map(mapRoleDTOToViewModel);
    },
    staleTime: ENV.STALE_TIME_STATIC,
  });
}
