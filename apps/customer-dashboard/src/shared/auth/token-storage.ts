import { create } from 'zustand';
import type { AuthSession } from './types';

/**
 * In-memory auth store. Tokens live ONLY here (never localStorage/sessionStorage),
 * so a full page reload is always unauthenticated until the backend issues an
 * httpOnly refresh cookie.
 */
interface AuthState {
  session: AuthSession | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: (session) =>
    set({
      session,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      isAuthenticated: true,
      isLoading: false,
    }),
  setTokens: (accessToken, refreshToken) =>
    set((state) => ({
      accessToken,
      refreshToken,
      session: state.session ? { ...state.session, accessToken, refreshToken } : state.session,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  clear: () =>
    set({
      session: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    }),
}));
