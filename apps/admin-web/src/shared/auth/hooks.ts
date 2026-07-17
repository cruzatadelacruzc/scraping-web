import { useContext } from 'react';

import type { AuthContextValue } from './auth-provider';
import { AuthContext } from './auth-provider';
import type { AuthSession } from './types';

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Returns the current session (null if not authenticated). */
export function useCurrentUser(): AuthSession | null {
  return useAuth().session;
}

/** Whether the user is authenticated. */
export function useIsAuthenticated(): boolean {
  return useAuth().isAuthenticated;
}

/** Whether auth state is still initializing. */
export function useAuthLoading(): boolean {
  return useAuth().isLoading;
}

/** Login action. Returns a void promise; throws on failure. */
export function useLogin(): AuthContextValue['login'] {
  return useAuth().login;
}

/** Logout action. Clears session and redirects to /login. */
export function useLogout(): AuthContextValue['logout'] {
  return useAuth().logout;
}
