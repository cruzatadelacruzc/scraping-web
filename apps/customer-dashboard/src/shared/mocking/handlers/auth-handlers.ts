import { http } from 'msw';
import {
  fail,
  findUser,
  issueTokens,
  makeJwt,
  ok,
  publicUser,
  userFromAuth,
  users,
  type MockUser,
} from './_shared';

/** Auth + account handlers, shaped to the real backend envelope/contract. */
export const authHandlers = [
  // Signup step 1: create account (+ auto TRIAL server-side). No user, no token.
  http.post('/api/accounts', async ({ request }) => {
    const body = (await request.json()) as { name?: string } | null;
    return ok(
      { account: { id: `acc_${Date.now()}`, name: body?.name ?? 'Account' } },
      'Account created',
      201
    );
  }),

  // Signup step 2: create owner user. Returns { user, token } (NO refreshToken).
  http.post('/api/accounts/register/local', async ({ request }) => {
    const body = (await request.json()) as {
      accountId: string;
      email: string;
      username: string;
      password: string;
      displayName?: string;
    };
    if (!body?.email || !body?.username || !body?.password) return fail('Invalid data', 400);
    if (users.has(body.email.toLowerCase())) return fail('Email already registered', 409);
    const u: MockUser = {
      id: `usr_${Date.now()}`,
      accountId: body.accountId,
      email: body.email.toLowerCase(),
      username: body.username.toLowerCase(),
      displayName: body.displayName,
      password: body.password,
      emailVerified: false,
    };
    users.set(u.email, u);
    const token = makeJwt({ userId: u.id, tenantId: u.accountId, roles: ['ACCOUNT_OWNER'] });
    return ok({ user: publicUser(u), token }, 'Registered', 201);
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string };
    if (!body?.username || !body?.password) return fail('Missing credentials', 400);
    const u = findUser(body.username);
    if (!u || u.password !== body.password) return fail('Invalid credentials', 401);
    return ok({ user: publicUser(u), ...issueTokens(u) }, 'Logged in');
  }),

  http.post('/api/auth/refresh', async ({ request }) => {
    const body = (await request.json()) as { refreshToken?: string };
    if (!body?.refreshToken) return fail('Missing refresh token', 400);
    const u = [...users.values()].find((x) => x.refreshToken === body.refreshToken);
    if (!u) return fail('Invalid refresh token', 401);
    return ok({ user: publicUser(u), ...issueTokens(u) }, 'Refreshed');
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = (await request.json()) as { email?: string };
    const u = body?.email ? users.get(body.email.toLowerCase()) : undefined;
    if (u) {
      const token = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      u.resetToken = token;
      u.resetTokenExpiry = Date.now() + 3600_000;
      console.info(`[MSW] Reset token for ${u.email}: ${token}`);
    }
    return ok({ message: 'If the email exists, a reset link was sent' });
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = (await request.json()) as { token?: string; newPassword?: string };
    const u = body?.token
      ? [...users.values()].find((x) => x.resetToken === body.token)
      : undefined;
    if (!u || !u.resetTokenExpiry || Date.now() > u.resetTokenExpiry || !body?.newPassword) {
      return fail('Invalid or expired token', 400);
    }
    u.password = body.newPassword;
    delete u.resetToken;
    delete u.resetTokenExpiry;
    return ok({ message: 'Password updated' });
  }),

  http.post('/api/auth/verify-email', async ({ request }) => {
    const body = (await request.json()) as { token?: string };
    if (!body?.token) return fail('Invalid token', 400);
    const u = [...users.values()].find((x) => !x.emailVerified);
    if (u) u.emailVerified = true;
    return ok({ message: 'Email verified' });
  }),

  http.post('/api/auth/send-verification-email', () => ok({ message: 'Verification email sent' })),

  http.put('/api/auth/password', async ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return fail('Unauthorized', 401);
    const body = (await request.json()) as { currentPassword?: string; newPassword?: string };
    if (u.password !== body?.currentPassword) return fail('Current password is incorrect', 400);
    if (body?.newPassword) u.password = body.newPassword;
    return ok({ message: 'Password changed' });
  }),

  http.put('/api/auth/email', async ({ request }) => {
    const u = userFromAuth(request);
    if (!u) return fail('Unauthorized', 401);
    const body = (await request.json()) as { newEmail?: string; password?: string };
    if (u.password !== body?.password) return fail('Password is incorrect', 400);
    if (body?.newEmail) {
      users.delete(u.email);
      u.email = body.newEmail.toLowerCase();
      u.emailVerified = false;
      users.set(u.email, u);
    }
    return ok({ message: 'Email changed' });
  }),

  http.post('/api/auth/logout', () => ok({ message: 'Logged out' })),

  http.post('/api/auth/link-provider', () => ok({ message: 'Provider linked' })),
  http.delete('/api/auth/link-provider/:provider', () => ok({ message: 'Provider unlinked' })),
];
