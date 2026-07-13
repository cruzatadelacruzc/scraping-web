import { useQuery } from '@tanstack/react-query';
import { ENV } from '@shared/config/env';
import { accountsService } from '../services/accounts-service';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import type { AccountViewModel } from '../view-models/account-view-model';

interface UseGetAccountsParams {
  page: number;
  limit: number;
  search?: string;
}

export function useGetAccounts(params: UseGetAccountsParams) {
  return useQuery({
    queryKey: ['accounts', params],
    queryFn: async ({ signal }) => {
      const response = await accountsService.list({ ...params, signal });
      return {
        items: response.data.items.map(mapAccountDTOToViewModel) as AccountViewModel[],
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}
