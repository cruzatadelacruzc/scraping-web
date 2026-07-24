import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import type { PlanFormValues } from '../schemas/plan-schemas';
import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PlanFormValues) => plansService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.list({}) });
      toast.success(i18n.t('plans.create.success'));
    },
    onError: () => {
      toast.error(i18n.t('plans.create.error'));
    },
  });
}
