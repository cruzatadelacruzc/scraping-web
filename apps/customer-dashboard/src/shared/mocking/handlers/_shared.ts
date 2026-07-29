import { HttpResponse } from 'msw';
import { decodeJwt } from '@/shared/auth/jwt';

/** Success envelope matching the backend ResponseHandler. */
export function ok(data: unknown, message = 'OK', status = 200) {
  return HttpResponse.json({ status: 'success', message, data }, { status });
}

/** Error envelope (no `data`, matching the backend). */
export function fail(message: string, status = 400) {
  return HttpResponse.json({ status: 'error', message }, { status });
}

function base64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Builds a decodable (unsigned) JWT so the client's decodeJwt yields a real exp. */
export function makeJwt(payload: Record<string, unknown>, ttlSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const body = base64url({ ...payload, iat: now, exp: now + ttlSeconds });
  return `${header}.${body}.mocksig`;
}

export interface MockUser {
  id: string;
  accountId: string;
  email: string;
  username: string;
  displayName?: string;
  password: string;
  emailVerified: boolean;
  resetToken?: string;
  resetTokenExpiry?: number;
  refreshToken?: string;
}

export const users = new Map<string, MockUser>();

// Seed a ready-to-use demo account for dev smoke testing.
users.set('demo@bazaarsentinel.app', {
  id: 'usr_demo',
  accountId: 'acc_demo',
  email: 'demo@bazaarsentinel.app',
  username: 'demo',
  displayName: 'Demo',
  password: 'Demo1234',
  emailVerified: true,
});

export function findUser(usernameOrEmail: string): MockUser | undefined {
  const key = usernameOrEmail.toLowerCase();
  return users.get(key) ?? [...users.values()].find((u) => u.username.toLowerCase() === key);
}

export function publicUser(u: MockUser) {
  const iso = new Date().toISOString();
  return {
    id: u.id,
    accountId: u.accountId,
    email: u.email,
    username: u.username,
    displayName: u.displayName,
    avatarUrl: undefined,
    emailVerified: u.emailVerified,
    roles: [{ id: 'role_owner', name: 'ACCOUNT_OWNER' }],
    createdAt: iso,
    updatedAt: iso,
  };
}

export function issueTokens(u: MockUser) {
  const token = makeJwt({
    userId: u.id,
    tenantId: u.accountId,
    roles: ['ACCOUNT_OWNER'],
    jti: `jti_${Date.now()}`,
  });
  const refreshToken = `refresh_${u.id}_${Date.now()}`;
  u.refreshToken = refreshToken;
  return { token, refreshToken };
}

export function userFromAuth(request: Request): MockUser | undefined {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return undefined;
  const payload = decodeJwt(auth.slice(7));
  if (!payload?.userId) return undefined;
  return [...users.values()].find((u) => u.id === payload.userId);
}
