import { ENV } from '@shared/config/env';
import { useQuery } from '@tanstack/react-query';

import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import { accountsService } from '../services/accounts-service';

import { accountKeys } from './query-keys';

interface Params {
  page: number;
  limit: number;
  search?: string;
}

export function useGetAccounts(params: Params) {
  const skip = (params.page - 1) * params.limit;
  const filters: Record<string, unknown> = {
    page: params.page,
    limit: params.limit,
    search: params.search ?? '',
  };

  return useQuery({
    queryKey: accountKeys.list(filters),
    queryFn: async ({ signal }) => {
      const response = await accountsService.list({
        skip,
        limit: params.limit,
        search: params.search,
        signal,
      });
      return {
        items: response.data.accounts.map(mapAccountDTOToViewModel),
        total: response.data.total,
      };
    },
    staleTime: ENV.STALE_TIME_STANDARD,
  });
}
