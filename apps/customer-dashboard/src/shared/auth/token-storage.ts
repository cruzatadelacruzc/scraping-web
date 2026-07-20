import { create } from 'zustand';
import type { AuthSession } from './types';

interface AuthState {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isAuthenticated: false,
  isLoading: true,
  setSession: (session) => set({ session, isAuthenticated: !!session, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ session: null, isAuthenticated: false }),
}));