import type { AuthService } from './auth-service';
import type { AuthSession } from './types';

/** Refresh 5 minutes before expiry (backend default: 24h JWT). */
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Owns the session lifecycle: refresh timers, auto-renewal, and clear-on-expiry.
 * Does NOT call the API directly — delegates to AuthService.
 */
export class SessionManager {
  private _session: AuthSession | null = null;
  private _refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private _onSessionLost: (() => void) | null = null;

  public constructor(private readonly _authService: AuthService) {}

  /** Current session (null if not authenticated). */
  public get session(): AuthSession | null {
    return this._session;
  }

  /** Register callback invoked when the session is lost (expired / refresh failed). */
  public onSessionLost(cb: () => void): void {
    this._onSessionLost = cb;
  }

  /** Starts a new session and arms the refresh timer. */
  public start(session: AuthSession): void {
    this._session = session;
    this._scheduleRefresh(session.expiresAt);
  }

  /**
   * Attempts to restore a session from a stored access token.
   * If the token is missing or the stored session data is stale, returns false.
   */
  public tryRestore(storedSession: AuthSession | null): boolean {
    if (!storedSession) return false;
    if (Date.now() >= storedSession.expiresAt) return false;

    this._session = storedSession;
    this._scheduleRefresh(storedSession.expiresAt);
    return true;
  }

  /** Stops the session: clears the timer and notifies listeners. */
  public stop(): void {
    this._clearTimer();
    this._session = null;
    this._onSessionLost?.();
  }

  /** Refreshes the session using the AuthService. */
  public async refresh(): Promise<void> {
    try {
      const newSession = await this._authService.refresh();
      this._session = newSession;
      this._scheduleRefresh(newSession.expiresAt);
    } catch {
      this.stop();
    }
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _scheduleRefresh(expiresAt: number): void {
    this._clearTimer();
    const delay = expiresAt - Date.now() - REFRESH_MARGIN_MS;
    if (delay <= 0) {
      void this.refresh();
      return;
    }
    this._refreshTimer = setTimeout(() => {
      void this.refresh();
    }, delay);
  }

  private _clearTimer(): void {
    if (this._refreshTimer !== null) {
      clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
    }
  }
}
