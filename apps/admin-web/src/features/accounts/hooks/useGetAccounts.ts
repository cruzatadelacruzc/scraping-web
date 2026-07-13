import { useQuery } from '@tanstack/react-query';
import { accountsService } from '../services/accounts-service';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';

interface UseGetAccountsParams {
  page: number;
  limit: number;
}

export function useGetAccounts(params: UseGetAccountsParams) {
  return useQuery({
    queryKey: ['accounts', 'list', params],
    queryFn: async () => {
      const response = await accountsService.list({ ...params });
      return {
        items: response.data.items.map(mapAccountDTOToViewModel),
        total: response.data.total,
      };
    },
    staleTime: 5 * 60 * 1000, // standard tier
    placeholderData: (prev) => prev,
  });
}
