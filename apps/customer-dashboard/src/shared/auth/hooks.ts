import { useAuthStore } from './token-storage';

export function useAuth() {
  const { session, isLoading } = useAuthStore();
  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  };
}

export function useHasPermission(_permission: string) {
  return false;
}

export function useCurrentUser() {
  return useAuthStore.getState().session;
}