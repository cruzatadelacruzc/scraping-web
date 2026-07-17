import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showRetryToast } from '../../marketplace/hooks/mutation-toast';
import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

interface UpdateRuleVariables {
  ruleKey: string;
  values: string[];
}

/**
 * Mutation to update an existing rule's values (replaces the whole array).
 * On success: invalidates the rule list and detail cache.
 * On error: shows a sticky toast with a Retry button.
 */
export function useUpdateRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleKey, values }: UpdateRuleVariables) =>
      rulesService.update(ruleKey, { values }),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ruleKeys.list({}) });
      void queryClient.invalidateQueries({ queryKey: ruleKeys.detail(variables.ruleKey) });
      toast.success('Rule updated');
    },
    onError: (error: Error) => {
      showRetryToast(error, () => {
        // Retry: caller re-fires mutate with same variables
      });
    },
  });
}
