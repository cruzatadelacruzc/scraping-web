import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';

import { mapUserDTOToViewModel } from '../mappers/user-mapper';
import { usersService } from '../services/users-service';

interface Params {
  page: number;
  limit: number;
  search?: string;
}

export function useGetUsers(params: Params) {
  return usePaginatedQuery({
    page: params.page,
    limit: params.limit,
    filters: {
      search: params.search ?? '',
    },
    queryKeyBase: 'users',
    queryFn: ({ skip, limit, signal }) =>
      usersService.list({ skip, limit, search: params.search, signal }).then((res) => ({
        items: res.data.users.map(mapUserDTOToViewModel),
        total: res.data.total,
      })),
  });
}
