import { useMutation } from '@tanstack/react-query';
import { authService } from '../services/auth-service';

export function useAuth() {
  const loginMutation = useMutation({ mutationFn: authService.login });

  return {
    login: loginMutation.mutate,
    isLoginLoading: loginMutation.isPending,
  };
}