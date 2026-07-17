import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showRetryToast } from '../../marketplace/hooks/mutation-toast';
import { rulesService } from '../services/rules-service';

import { ruleKeys } from './query-keys';

/**
 * Mutation to toggle a rule's enabled flag.
 * On success: invalidates list + detail cache.
 * On error: shows sticky toast with Retry.
 */
export function useToggleRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleKey: string) => rulesService.toggle(ruleKey),
    onSuccess: (_data, ruleKey) => {
      void queryClient.invalidateQueries({ queryKey: ruleKeys.list({}) });
      void queryClient.invalidateQueries({ queryKey: ruleKeys.detail(ruleKey) });
      toast.success('Rule toggled');
    },
    onError: (error: Error) => {
      showRetryToast(error, () => {
        // Retry: caller re-fires mutate with same ruleKey
      });
    },
  });
}
