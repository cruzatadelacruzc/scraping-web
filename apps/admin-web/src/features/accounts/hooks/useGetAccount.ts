import { useQuery } from '@tanstack/react-query';
import { accountsService } from '../services/accounts-service';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import type { AccountViewModel } from '../view-models/account-view-model';

export function useGetAccount(id: string | null) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: async () => {
      const { data } = await accountsService.getById(id!);
      return mapAccountDTOToViewModel(data) as AccountViewModel;
    },
    enabled: id !== null,
    staleTime: 5 * 60 * 1000,
  });
}
