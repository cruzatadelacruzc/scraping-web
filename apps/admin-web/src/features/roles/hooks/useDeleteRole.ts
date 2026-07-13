import i18n from '@shared/i18n/i18n';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { rolesService } from '../services/roles-service';

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rolesService.delete(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success(i18n.t('roles.delete.success'));
    },
    onError: () => {
      toast.error(i18n.t('roles.delete.error'));
    },
  });
}
