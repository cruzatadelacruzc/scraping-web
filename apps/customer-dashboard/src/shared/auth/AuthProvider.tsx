import { createContext, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import { authService, sessionManager } from './runtime';
import { useAuthStore } from './token-storage';
import type { LinkProviderInput, RegisterInput } from './auth-service';
import type { AuthSession, UserViewModel } from './types';

export interface AuthContextValue {
  session: AuthSession | null;
  user: UserViewModel | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  changeEmail: (newEmail: string, password: string) => Promise<void>;
  linkProvider: (input: LinkProviderInput) => Promise<void>;
  unlinkProvider: (provider: string) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Top-level auth boundary. Reads session state from the in-memory Zustand store
 * and exposes the full action surface. Must live INSIDE the data router
 * (actions may navigate); mounted via RootLayout.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);

  useEffect(() => {
    // In-memory: no persisted token → boot is unauthenticated. Clear the
    // initial loading flag immediately; cancel any timer on unmount.
    useAuthStore.getState().setLoading(false);
    return () => sessionManager.cancelScheduledRefresh();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated,
      isLoading,
      login: async (username, password) => {
        const s = await authService.login(username, password);
        useAuthStore.getState().setSession(s);
        sessionManager.scheduleRefresh(s.expiresAt);
      },
      register: async (input) => {
        const s = await authService.register(input);
        useAuthStore.getState().setSession(s);
        sessionManager.scheduleRefresh(s.expiresAt);
      },
      logout: async () => {
        const refreshToken = useAuthStore.getState().refreshToken;
        sessionManager.cancelScheduledRefresh();
        await authService.logout(refreshToken ?? undefined);
        useAuthStore.getState().clear();
      },
      forgotPassword: (email) => authService.forgotPassword(email),
      resetPassword: (token, newPassword) => authService.resetPassword(token, newPassword),
      verifyEmail: (token) => authService.verifyEmail(token),
      resendVerification: () => authService.resendVerification(),
      changePassword: (currentPassword, newPassword) =>
        authService.changePassword(currentPassword, newPassword),
      changeEmail: (newEmail, password) => authService.changeEmail(newEmail, password),
      linkProvider: (input) => authService.linkProvider(input),
      unlinkProvider: (provider) => authService.unlinkProvider(provider),
    }),
    [session, isAuthenticated, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
