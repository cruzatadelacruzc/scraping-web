import type { ITokenStorage } from './token-storage.interface';

/**
 * In-memory token storage using closure variables.
 * Tokens are not persisted — page refresh forces re-login.
 * Acceptable trade-off for an admin operations console.
 */
export class InMemoryStorage implements ITokenStorage {
  private _accessToken: string | null = null;
  private _refreshToken: string | null = null;

  public getAccessToken(): string | null {
    return this._accessToken;
  }

  public getRefreshToken(): string | null {
    return this._refreshToken;
  }

  public setAccessToken(token: string): void {
    this._accessToken = token;
  }

  public setRefreshToken(token: string): void {
    this._refreshToken = token;
  }

  public clear(): void {
    this._accessToken = null;
    this._refreshToken = null;
  }
}
