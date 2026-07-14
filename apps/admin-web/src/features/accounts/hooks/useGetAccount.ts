import { useQuery } from '@tanstack/react-query';

import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import { accountsService } from '../services/accounts-service';

export function useGetAccount(id: string | null) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      if (id === null) {
        throw new Error('useGetAccount called with null id');
      }
      const { data } = await accountsService.getById(id);
      return mapAccountDTOToViewModel(data);
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}
