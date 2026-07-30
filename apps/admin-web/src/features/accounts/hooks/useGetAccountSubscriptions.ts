import { useQuery } from '@tanstack/react-query';

import { accountSubscriptionsService } from '../services/account-subscriptions-service';

export function useGetAccountSubscriptions(accountId: string | null) {
  return useQuery({
    queryKey: ['accounts', 'subscriptions', accountId],
    queryFn: async () => {
      if (accountId === null) {
        throw new Error('useGetAccountSubscriptions called with null accountId');
      }
      const { data } = await accountSubscriptionsService.listByAccount(accountId);
      return data.subscriptions;
    },
    enabled: accountId !== null,
    staleTime: 5 * 60 * 1000,
  });
}
