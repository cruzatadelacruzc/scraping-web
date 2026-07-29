import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './AuthProvider';
import { useAuthStore } from './token-storage';
import type { Permission, UserViewModel } from './types';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function useCurrentUser(): UserViewModel | null {
  return useAuthStore((s) => s.session?.user ?? null);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((s) => s.isAuthenticated);
}

export function useAuthLoading(): boolean {
  return useAuthStore((s) => s.isLoading);
}

export function useHasPermission(permission: Permission | string): boolean {
  return useAuthStore((s) => s.session?.permissions.includes(permission) ?? false);
}
