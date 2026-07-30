import { useRef } from 'react';
import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { showRetryToast } from '../../marketplace/hooks/mutation-toast';
import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

/**
 * Toggles a role between active and deactivated.
 * On success: invalidates the roles query and shows a success toast.
 * On error: sticky error toast with Retry action.
 */
export function useToggleRole() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (roleId: string) => usersService.toggleRole(roleId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.roles });
      toast.success(i18n.t('roles.toggleSuccess'));
    },
    onError: (error: Error, roleId) => {
      showRetryToast(error, () => {
        mutateRef.current(roleId);
      });
    },
  });

  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  return mutation;
}
