import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

export function useRemoveRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      usersService.removeRole(userId, roleId),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: userKeys.detail(variables.userId) });
      toast.success(i18n.t('users.removeRoleSuccess'));
    },
    onError: () => {
      toast.error(i18n.t('users.removeRoleError'));
    },
  });
}
