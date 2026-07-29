import { configureAuthHandlers } from '@/shared/api/client';
import { AuthService } from './auth-service';
import { SessionManager } from './session-manager';
import { useAuthStore } from './token-storage';

/**
 * Auth singletons + api-client wiring. Importing this module (which the
 * AuthProvider does) configures the shared apiClient's auth interceptors
 * once, at module-eval time, before any request is made.
 */
export const authService = new AuthService();

export const sessionManager = new SessionManager(
  authService,
  () => useAuthStore.getState().refreshToken,
  (session) => useAuthStore.getState().setSession(session)
);

configureAuthHandlers({
  getAccessToken: () => useAuthStore.getState().accessToken,
  refresh: async () => {
    const session = await sessionManager.refresh();
    return session.accessToken;
  },
  onAuthFailure: () => useAuthStore.getState().clear(),
});
