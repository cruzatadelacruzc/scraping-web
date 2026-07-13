import type { ITokenStorage } from './token-storage.interface';
import type { AuthResponse, AuthSession } from './types';
import type { RoleType } from './types';

const API_BASE = 'http://localhost:3000/api';

/** JWT TTL: 1 day in ms. Must match JWT_EXPIRATION env var on backend. */
const JWT_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Single boundary between the auth system and the backend API.
 * Returns AuthSession, never raw tokens.
 */
export class AuthService {
  public constructor(private readonly _storage: ITokenStorage) {}

  /**
   * Authenticates with email/password and returns a session.
   * Stores tokens in the configured ITokenStorage backend.
   *
   * @throws `'Invalid credentials'` on 401.
   */
  public async login(email: string, password: string): Promise<AuthSession> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      if (res.status === 401) throw new Error('Invalid credentials');
      throw new Error(`Login failed: ${String(res.status)}`);
    }

    const data = (await res.json()) as AuthResponse;
    this._persistTokens(data);
    return this._toSession(data);
  }

  /**
   * Refreshes the access token using the stored refresh token.
   * On failure, clears storage so the user is redirected to login.
   *
   * @throws `'No refresh token available'` if storage is empty.
   * @throws `'Session expired'` on refresh rejection.
   */
  public async refresh(): Promise<AuthSession> {
    const refreshToken = this._storage.getRefreshToken();
    if (!refreshToken) {
      this._storage.clear();
      throw new Error('No refresh token available');
    }

    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      this._storage.clear();
      throw new Error('Session expired');
    }

    const data = (await res.json()) as AuthResponse;
    this._persistTokens(data);
    return this._toSession(data);
  }

  /** Clears stored tokens. Call on explicit logout. */
  public logout(): void {
    this._storage.clear();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private _persistTokens(data: AuthResponse): void {
    this._storage.setAccessToken(data.token);
    this._storage.setRefreshToken(data.refreshToken);
  }

  private _toSession(data: AuthResponse): AuthSession {
    return {
      userId: data.user.id,
      accountId: data.user.accountId,
      roles: data.user.roles.map((r) => r as RoleType),
      expiresAt: Date.now() + JWT_TTL_MS,
    };
  }
}
