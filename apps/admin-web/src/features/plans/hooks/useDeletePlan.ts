import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useDeletePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => plansService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(i18n.t('plans.delete.success'));
    },
    onError: () => {
      toast.error(i18n.t('plans.delete.error'));
    },
  });
}
