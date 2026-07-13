import type { ITokenStorage } from './token-storage.interface';

/**
 * Hybrid token storage: keeps access token in memory (no XSS surface),
 * persists refresh token in sessionStorage (survives F5, cleared on tab close).
 *
 * Trade-off: access token is lost on refresh, requiring a refresh call.
 * This is acceptable because the refresh token is available to silently
 * re-authenticate without user interaction.
 */
export class InMemoryStorage implements ITokenStorage {
  private readonly _refreshKey = 'bazaarsentinel.refreshToken';

  private _accessToken: string | null = null;

  public getAccessToken(): string | null {
    return this._accessToken;
  }

  public getRefreshToken(): string | null {
    try {
      return window.sessionStorage.getItem(this._refreshKey);
    } catch {
      return null;
    }
  }

  public setAccessToken(token: string): void {
    this._accessToken = token;
  }

  public setRefreshToken(token: string): void {
    try {
      window.sessionStorage.setItem(this._refreshKey, token);
    } catch {
      // sessionStorage unavailable (private browsing, etc.)
    }
  }

  public clear(): void {
    this._accessToken = null;
    try {
      window.sessionStorage.removeItem(this._refreshKey);
    } catch {
      // ignore
    }
  }
}
