import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthService } from '../auth-service';
import { SessionManager } from '../session-manager';
import { RoleType, type AuthSession } from '../types';

function makeSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    userId: 'user-1',
    accountId: 'account-1',
    username: 'admin',
    email: 'admin@test.dev',
    roles: [RoleType.SUPER_ADMIN],
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    ...overrides,
  };
}

describe('SessionManager.refresh', () => {
  let sessionManager: SessionManager;

  afterEach(() => {
    sessionManager.stop();
    vi.clearAllMocks();
  });

  it('shares one in-flight request across concurrent refresh() calls', async () => {
    let resolveRefresh!: (session: AuthSession) => void;
    const authService = {
      refresh: vi.fn().mockReturnValue(
        new Promise<AuthSession>((resolve) => {
          resolveRefresh = resolve;
        }),
      ),
    } as unknown as AuthService;
    sessionManager = new SessionManager(authService);

    const first = sessionManager.refresh();
    const second = sessionManager.refresh();

    expect(authService.refresh).toHaveBeenCalledTimes(1);

    resolveRefresh(makeSession());
    await Promise.all([first, second]);

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(sessionManager.session).not.toBeNull();
  });

  it('allows a new refresh after the in-flight one settles', async () => {
    const authService = {
      refresh: vi.fn().mockResolvedValue(makeSession()),
    } as unknown as AuthService;
    sessionManager = new SessionManager(authService);

    await sessionManager.refresh();
    await sessionManager.refresh();

    expect(authService.refresh).toHaveBeenCalledTimes(2);
  });

  it('clears the session when the shared refresh rejects', async () => {
    const authService = {
      refresh: vi.fn().mockRejectedValue(new Error('Session expired')),
    } as unknown as AuthService;
    sessionManager = new SessionManager(authService);
    const lost = vi.fn();
    sessionManager.onSessionLost(lost);

    await Promise.all([sessionManager.refresh(), sessionManager.refresh()]);

    expect(authService.refresh).toHaveBeenCalledTimes(1);
    expect(sessionManager.session).toBeNull();
    expect(lost).toHaveBeenCalledTimes(1);
  });
});
