import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { accountSubscriptionsService } from '../services/account-subscriptions-service';

export function useAssignSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { accountId: string; planId: string }) =>
      accountSubscriptionsService.assign(data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['accounts', 'subscriptions', variables.accountId],
      });
      void queryClient.invalidateQueries({ queryKey: ['accounts', 'detail', variables.accountId] });
      toast.success(i18n.t('accounts.subscription.assign.success'));
    },
    onError: () => {
      toast.error(i18n.t('accounts.subscription.assign.error'));
    },
  });
}
