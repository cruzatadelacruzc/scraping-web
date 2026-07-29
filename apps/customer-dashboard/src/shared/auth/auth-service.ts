import { apiClient } from '@/shared/api/client';
import { ENDPOINTS } from '@/shared/api/endpoints';
import { expiresAtFromToken } from './jwt';
import { rolesToPermissions } from './permissions';
import type { AuthSession, UserViewModel } from './types';

interface BackendRole {
  id: string;
  name: string;
}

interface BackendUser {
  id: string;
  accountId: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  emailVerified?: boolean;
  roles?: BackendRole[] | string[];
  createdAt?: string;
  updatedAt?: string;
}

/** Shape returned (post envelope-unwrap) by login/register/refresh. */
interface AuthPayload {
  user: BackendUser;
  token: string;
  refreshToken?: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  displayName?: string;
}

export interface LinkProviderInput {
  provider: string;
  providerId: string;
  idToken?: string;
  accessToken?: string;
}

function normalizeRoles(roles: BackendUser['roles']): BackendRole[] {
  if (!roles) return [];
  return roles.map((r) => (typeof r === 'string' ? { id: r, name: r } : r));
}

function toUserViewModel(u: BackendUser): UserViewModel {
  return {
    id: u.id,
    accountId: u.accountId,
    email: u.email,
    username: u.username,
    displayName: u.displayName ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    emailVerified: Boolean(u.emailVerified),
    roles: normalizeRoles(u.roles),
    createdAt: u.createdAt ?? '',
    updatedAt: u.updatedAt ?? '',
  };
}

function toSession(payload: AuthPayload): AuthSession {
  const user = toUserViewModel(payload.user);
  const roleNames = user.roles.map((r) => r.name);
  return {
    userId: user.id,
    accountId: user.accountId,
    roles: roleNames,
    permissions: rolesToPermissions(roleNames),
    expiresAt: expiresAtFromToken(payload.token),
    accessToken: payload.token,
    refreshToken: payload.refreshToken ?? '',
    user,
  };
}

/**
 * API boundary for auth. Uses the shared apiClient (envelope already unwrapped
 * by its response interceptor) and maps the backend `{ user, token, refreshToken }`
 * into an `AuthSession` with a JWT-decoded expiry.
 */
export class AuthService {
  async login(username: string, password: string): Promise<AuthSession> {
    const res = await apiClient.post<AuthPayload>(ENDPOINTS.AUTH.LOGIN, { username, password });
    return toSession(res.data);
  }

  /**
   * Customer signup is a 3-call chain (isolated here so a future combined
   * endpoint is a one-method swap): create account → register owner user →
   * log in to obtain a renewable refresh token (register/local returns none).
   */
  async register(input: RegisterInput): Promise<AuthSession> {
    const accRes = await apiClient.post<{ account: { id: string } }>(ENDPOINTS.ACCOUNTS.CREATE, {
      name: input.displayName || input.username,
    });
    const accountId = accRes.data.account.id;
    await apiClient.post(ENDPOINTS.AUTH.REGISTER_LOCAL, {
      accountId,
      email: input.email,
      username: input.username,
      password: input.password,
      displayName: input.displayName,
    });
    return this.login(input.email, input.password);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const res = await apiClient.post<AuthPayload>(ENDPOINTS.AUTH.REFRESH, { refreshToken });
    return toSession(res.data);
  }

  async logout(refreshToken?: string): Promise<void> {
    try {
      await apiClient.post(ENDPOINTS.AUTH.LOGOUT, refreshToken ? { refreshToken } : {});
    } catch {
      // best-effort; local session is cleared regardless
    }
  }

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.FORGOT_PASSWORD, { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.RESET_PASSWORD, { token, newPassword });
  }

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.VERIFY_EMAIL, { token });
  }

  async resendVerification(): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.SEND_VERIFICATION);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.put(ENDPOINTS.AUTH.CHANGE_PASSWORD, { currentPassword, newPassword });
  }

  async changeEmail(newEmail: string, password: string): Promise<void> {
    await apiClient.put(ENDPOINTS.AUTH.CHANGE_EMAIL, { newEmail, password });
  }

  async linkProvider(input: LinkProviderInput): Promise<void> {
    await apiClient.post(ENDPOINTS.AUTH.LINK_PROVIDER, input);
  }

  async unlinkProvider(provider: string): Promise<void> {
    await apiClient.delete(`${ENDPOINTS.AUTH.LINK_PROVIDER}/${provider}`);
  }
}
