import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

/**
 * Mutation to delete a rule by its key.
 * On success: invalidates all rule queries.
 * On error: shows a sticky toast with a Retry button.
 *
 * @remarks The backend DELETE endpoint is not yet exposed —
 * this will 404 until implemented server-side.
 */
export function useDeleteRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleKey: string) => rulesService.delete(ruleKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ruleKeys.all });
      toast.success('Rule permanently deleted');
    },
    onError: (error: Error) => {
      showRetryToast(error, () => {
        // Retry: caller re-fires mutate with same ruleKey
      });
    },
  });
}
