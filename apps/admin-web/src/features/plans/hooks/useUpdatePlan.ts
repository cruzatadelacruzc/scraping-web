import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { PlanFormValues } from '../schemas/plan-schemas';
import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormValues }) =>
      plansService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: planKeys.list({}) });
      void queryClient.invalidateQueries({ queryKey: planKeys.detail(variables.id) });
      toast.success(i18n.t('plans.update.success'));
    },
    onError: () => {
      toast.error(i18n.t('plans.update.error'));
    },
  });
}
