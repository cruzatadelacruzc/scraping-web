import { useQuery } from '@tanstack/react-query';
import { ENV } from '@shared/config/env';
import { accountsService } from '../services/accounts-service';
import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import type { AccountViewModel } from '../view-models/account-view-model';

interface Params {
  page: number;
  limit: number;
}

export function useGetAccounts(params: Params) {
  const skip = (params.page - 1) * params.limit;

  return useQuery({
    queryKey: ['accounts', { page: params.page, limit: params.limit }],
    queryFn: async ({ signal }) => {
      const response = await accountsService.list({ skip, limit: params.limit, signal });
      return {
        items: response.data.accounts.map(mapAccountDTOToViewModel) as AccountViewModel[],
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}
