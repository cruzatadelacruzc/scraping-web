import { useRef } from 'react';
import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showRetryToast } from '../../marketplace/hooks/mutation-toast';
import type { PlanFormValues } from '../schemas/plan-schemas';
import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormValues }) =>
      plansService.update(id, data),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: planKeys.list({}) });
      void queryClient.invalidateQueries({ queryKey: planKeys.detail(variables.id) });
      toast.success(i18n.t('plans.update.success'));
    },
    onError: (error: Error, variables) => {
      showRetryToast(error, () => {
        mutateRef.current(variables);
      });
    },
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  return mutation;
}
