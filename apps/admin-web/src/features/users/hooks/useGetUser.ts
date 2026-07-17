import { useQuery } from '@tanstack/react-query';

import { mapUserDTOToViewModel } from '../mappers/user-mapper';
import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

export function useGetUser(id: string | null) {
  return useQuery({
    queryKey: userKeys.detail(id ?? ''),
    queryFn: async () => {
      /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- id is non-null when query is enabled */
      const { data } = await usersService.getById(id!);
      return mapUserDTOToViewModel(data);
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}
