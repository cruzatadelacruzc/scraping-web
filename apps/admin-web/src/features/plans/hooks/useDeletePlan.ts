import { useRef } from 'react';
import i18n from '@shared/i18n/i18n';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { plansService } from '../services/plans-service';

import { planKeys } from './query-keys';

export function useDeletePlan() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => plansService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: planKeys.all });
      toast.success(i18n.t('plans.delete.success'));
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
