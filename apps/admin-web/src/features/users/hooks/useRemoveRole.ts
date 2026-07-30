import { useRef } from 'react';
import i18n from '@shared/i18n/i18n';
import { showRetryToast } from '@shared/ui/mutation-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

/**
 * Removes a role from a user.
 * On success: invalidates the user detail and roles queries, shows a success toast.
 * On error: sticky error toast with a Retry action that re-fires with the same variables.
 */
export function useRemoveRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersService.removeRole(userId, roleId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      await queryClient.invalidateQueries({ queryKey: userKeys.roles });
      toast.success(i18n.t('users.removeRoleSuccess'));
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
