import React from 'react';
import { useAuthStore } from './token-storage';

export const AuthProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  useAuthStore.getState().setLoading(false);
  return <>{children}</>;
};