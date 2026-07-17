import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { accountsService } from '../services/accounts-service';

import { accountKeys } from './query-keys';

export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => accountsService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: accountKeys.all });
      toast.success(i18n.t('accounts.deleteSuccess'));
    },
    onError: () => {
      toast.error(i18n.t('accounts.deleteError'));
    },
  });
}
