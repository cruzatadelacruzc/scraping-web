import type { AuthService } from './auth-service';
import type { AuthSession } from './types';

const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Owns the refresh lifecycle: single-flight de-duplication + a timer that
 * proactively refreshes ~5 min before the access token expires.
 */
export class SessionManager {
  private refreshPromise: Promise<AuthSession> | null = null;
  private expiryTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly authService: AuthService,
    private readonly getRefreshToken: () => string | null,
    private readonly onSession: (session: AuthSession) => void
  ) {}

  async initialize(): Promise<void> {
    // In-memory model: nothing is persisted, so a fresh load is always
    // unauthenticated. Kept for symmetry / future httpOnly-cookie support.
  }

  async refresh(): Promise<AuthSession> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async performRefresh(): Promise<AuthSession> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');
    const session = await this.authService.refresh(refreshToken);
    this.onSession(session);
    this.scheduleRefresh(session.expiresAt);
    return session;
  }

  scheduleRefresh(expiresAt: number): void {
    this.cancelScheduledRefresh();
    const delay = expiresAt - Date.now() - REFRESH_MARGIN_MS;
    if (delay > 0) {
      this.expiryTimer = setTimeout(() => {
        void this.refresh().catch(() => undefined);
      }, delay);
    }
  }

  cancelScheduledRefresh(): void {
    if (this.expiryTimer) {
      clearTimeout(this.expiryTimer);
      this.expiryTimer = null;
    }
  }
}
