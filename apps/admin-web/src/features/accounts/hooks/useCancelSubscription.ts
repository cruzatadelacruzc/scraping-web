import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { accountSubscriptionsService } from '../services/account-subscriptions-service';

export function useCancelSubscription(accountId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) => accountSubscriptionsService.cancel(subscriptionId),
    onSuccess: () => {
      if (accountId) {
        void queryClient.invalidateQueries({
          queryKey: ['accounts', 'subscriptions', accountId],
        });
        void queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', accountId] });
      }
      toast.success(i18n.t('accounts.subscription.cancel.success'));
    },
    onError: () => {
      toast.error(i18n.t('accounts.subscription.cancel.error'));
    },
  });
}
