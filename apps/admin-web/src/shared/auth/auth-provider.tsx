import type { ReactNode } from 'react';
import { createContext, useCallback, useEffect, useMemo, useState } from 'react';

import type { AuthService } from './auth-service';
import type { SessionManager } from './session-manager';
import type { ITokenStorage } from './token-storage.interface';
import type { AuthSession, LoginCredentials } from './types';

export interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | null>(null);

interface Props {
  authService: AuthService;
  sessionManager: SessionManager;
  storage: ITokenStorage;
  children: ReactNode;
}

/**
 * Top-level auth boundary. Exposes session state and login/logout actions.
 * SessionManager owns the lifecycle; AuthService is the API boundary.
 */
export function AuthProvider({ authService, sessionManager, storage, children }: Props): JSX.Element {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Wire session manager callbacks
  useEffect(() => {
    sessionManager.onSessionLost(() => {
      setSession(null);
    });

    // Access token is in-memory and is ALWAYS null after page refresh.
    // Check for a persisted refresh token instead. If present, silently
    // re-authenticate via the refresh endpoint to get a new access token.
    const hasRefreshToken = storage.getRefreshToken() !== null;
    if (hasRefreshToken) {
      sessionManager
        .refresh()
        .then(() => {
          setSession(sessionManager.session);
        })
        .catch(() => {
          storage.clear();
        })
        .finally(() => { setIsLoading(false); });
    } else {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const newSession = await authService.login(credentials.username, credentials.password);
      sessionManager.start(newSession);
      setSession(newSession);
    },
    [authService, sessionManager],
  );

  const logout = useCallback(() => {
    authService.logout();
    sessionManager.stop();
    setSession(null);
  }, [authService, sessionManager]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isAuthenticated: session !== null,
      login,
      logout,
    }),
    [session, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
