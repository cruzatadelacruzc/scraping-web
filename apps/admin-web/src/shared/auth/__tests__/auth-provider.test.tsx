import { StrictMode, useContext } from 'react';
import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthContext, AuthProvider } from '../auth-provider';
import { AuthService } from '../auth-service';
import { SessionManager } from '../session-manager';
import type { ITokenStorage } from '../token-storage.interface';
import { RoleType, type AuthSession } from '../types';

function makeSession(): AuthSession {
  return {
    userId: 'user-1',
    accountId: 'account-1',
    username: 'admin',
    email: 'admin@test.dev',
    roles: [RoleType.SUPER_ADMIN],
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  };
}

function fakeStorage(refreshToken: string | null): ITokenStorage {
  let refresh = refreshToken;
  let access: string | null = null;
  return {
    getAccessToken: () => access,
    getRefreshToken: () => refresh,
    setAccessToken: (t) => {
      access = t;
    },
    setRefreshToken: (t) => {
      refresh = t;
    },
    clear: vi.fn(() => {
      access = null;
      refresh = null;
    }),
  };
}

/** Renders the auth loading flag so the test can await bootstrap completion. */
function BootstrapProbe(): JSX.Element {
  const ctx = useContext(AuthContext);
  return <div>bootstrap: {ctx?.isLoading ? 'loading' : 'ready'}</div>;
}

describe('AuthProvider bootstrap', () => {
  let sessionManager: SessionManager | null = null;

  afterEach(() => {
    // stop() fires the onSessionLost callback (setSession) — wrap so the tear-
    // down of the still-mounted tree doesn't trip the act warning.
    act(() => {
      sessionManager?.stop();
    });
    sessionManager = null;
    vi.restoreAllMocks();
  });

  async function renderUnderStrictMode(storage: ITokenStorage) {
    const authService = new AuthService(storage);
    const refreshSpy = vi.spyOn(authService, 'refresh').mockResolvedValue(makeSession());
    sessionManager = new SessionManager(authService);
    const sm = sessionManager;

    render(
      <StrictMode>
        <AuthProvider authService={authService} sessionManager={sm} storage={storage}>
          <BootstrapProbe />
        </AuthProvider>
      </StrictMode>,
    );

    await screen.findByText('bootstrap: ready');
    return { refreshSpy };
  }

  it('refreshes exactly once on mount under StrictMode when a refresh token exists', async () => {
    const { refreshSpy } = await renderUnderStrictMode(fakeStorage('stored-refresh-token'));

    // StrictMode double-invokes the mount effect; the single-flight in
    // SessionManager.refresh() collapses that to one endpoint hit so the
    // backend's refresh-token rotation / theft detection does not fire.
    expect(refreshSpy).toHaveBeenCalledTimes(1);
  });

  it('does not refresh when there is no stored refresh token', async () => {
    const { refreshSpy } = await renderUnderStrictMode(fakeStorage(null));

    expect(refreshSpy).not.toHaveBeenCalled();
  });
});
