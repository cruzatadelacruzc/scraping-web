import { ENV } from '@shared/config/env';

import type { ITokenStorage } from './token-storage.interface';
import type { AuthResponse, AuthSession } from './types';
import type { RoleType } from './types';

/** JWT TTL: 1 day in ms. Must match JWT_EXPIRATION env var on backend. */
const JWT_TTL_MS = 24 * 60 * 60 * 1000;

/** Backend wraps all responses in { status, message, data }. */
interface BackendEnvelope<T> {
  status: string;
  message: string;
  data: T;
}

/**
 * Single boundary between the auth system and the backend API.
 * Returns AuthSession, never raw tokens.
 */
export class AuthService {
  public constructor(private readonly _storage: ITokenStorage) {}

  /**
   * Authenticates with username/password and returns a session.
   * Stores tokens in the configured ITokenStorage backend.
   *
   * @throws Error with a user-friendly message on failure.
   */
  public async login(username: string, password: string): Promise<AuthSession> {
    const url = `${ENV.API_BASE_URL}/auth/login`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (!res.ok) {
      const message = await this._extractErrorMessage(res);
      throw new Error(message);
    }

    const envelope = (await res.json()) as BackendEnvelope<AuthResponse>;
    this._persistTokens(envelope.data);
    return this._toSession(envelope.data);
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

    // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
    const res = await fetch(`${ENV.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      this._storage.clear();
      throw new Error('Session expired');
    }

    const envelope = (await res.json()) as BackendEnvelope<AuthResponse>;
    this._persistTokens(envelope.data);
    return this._toSession(envelope.data);
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
      username: data.user.username,
      email: data.user.email,
      roles: data.user.roles.map((r) => r.name as RoleType),
      expiresAt: Date.now() + JWT_TTL_MS,
    };
  }

  /** Extracts a user-friendly error message from the backend response. */
  private async _extractErrorMessage(res: Response): Promise<string> {
    if (res.status === 401) return 'Invalid credentials';

    try {
      const body = (await res.json()) as Record<string, unknown>;
      if (typeof body.message === 'string' && body.message.length > 0) {
        return body.message;
      }
      if (Array.isArray(body.error)) {
        const messages = (body.error as { message: string }[])
          .map((e) => e.message)
          .join(', ');
        if (messages.length > 0) return messages;
      }
    } catch {
      // Response is not JSON — use status text
    }

    return `Request failed (${String(res.status)})`;
  }
}
