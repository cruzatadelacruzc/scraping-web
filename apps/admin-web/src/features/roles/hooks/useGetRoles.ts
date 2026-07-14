import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapRoleDTOToViewModel } from '../mappers/role-mapper';
import { rolesService } from '../services/roles-service';

export function useGetRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async ({ signal }) => {
      const response = await rolesService.list({ signal });
      return {
        items: response.data.roles.map(mapRoleDTOToViewModel),
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STATIC,
  });
}
