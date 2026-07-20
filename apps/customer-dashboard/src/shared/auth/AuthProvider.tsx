import React from 'react';
import { useAuthStore } from './token-storage';

export const AuthProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useAuthStore.getState().setLoading(false);
  return <>{children}</>;
};

export const useAuth = () => {
  const { session, isLoading } = useAuthStore();
  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    login: async () => {},
    register: async () => {},
    logout: async () => {},
  };
};

export const useHasPermission = (_permission: string) => false;
export const useCurrentUser = () => useAuthStore.getState().session;