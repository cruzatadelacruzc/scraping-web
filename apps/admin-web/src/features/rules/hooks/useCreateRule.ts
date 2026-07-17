import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showRetryToast } from '../../marketplace/hooks/mutation-toast';
import type { CreateRulePayload } from '../services/rules-service';
import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

/**
 * Mutation to create a new extraction rule.
 * On success: invalidates the rule list so the table refreshes.
 * On error: shows a sticky toast with a Retry button.
 */
export function useCreateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRulePayload) => rulesService.create(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ruleKeys.all });
      toast.success('Rule created');
    },
    onError: (error: Error) => {
      showRetryToast(error, () => {
        // Retry: caller re-fires mutate with same variables
      });
    },
  });
}
