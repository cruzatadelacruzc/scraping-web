import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { usersService } from '../services/users-service';

import { userKeys } from './query-keys';

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: userKeys.all });
      toast.success(i18n.t('users.deleteSuccess'));
    },
    onError: () => {
      toast.error(i18n.t('users.deleteError'));
    },
  });
}
