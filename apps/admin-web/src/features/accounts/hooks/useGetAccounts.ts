import { usePaginatedQuery } from '@shared/hooks/usePaginatedQuery';

import { mapAccountDTOToViewModel } from '../mappers/account-mapper';
import { accountsService } from '../services/accounts-service';

interface Params {
  page: number;
  limit: number;
  search?: string;
}

export function useGetAccounts(params: Params) {
  return usePaginatedQuery({
    page: params.page,
    limit: params.limit,
    filters: {
      search: params.search ?? '',
    },
    queryKeyBase: 'accounts',
    queryFn: ({ skip, limit, signal }) =>
      accountsService.list({ skip, limit, search: params.search, signal }).then((res) => ({
        items: res.data.accounts.map(mapAccountDTOToViewModel),
        total: res.data.total,
      })),
  });
}
