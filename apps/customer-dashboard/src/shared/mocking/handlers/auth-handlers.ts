import { http, HttpResponse } from 'msw';
import { authCredentialsSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema, verifyEmailSchema } from '@/features/auth/validation/auth-schemas';
import type { User } from '@/features/auth/types/auth-types';
import type { AuthTokens } from '@/features/auth/types/auth-types';

type UserRecord = User & {
  passwordHash: string;
  resetToken?: string;
  resetTokenExpiry?: number;
};

const users = new Map<string, UserRecord>();

const createTokens = (): AuthTokens => ({
  accessToken: `mock_access_${Date.now()}` as any,
  refreshToken: `mock_refresh_${Date.now()}` as any,
  expiresIn: 3600,
});

export const authHandlers = [
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json();
    const parsed = authCredentialsSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }
    const user = users.get(parsed.data.email);
    if (!user) {
      return HttpResponse.json({ error: 'User not found' }, { status: 401 });
    }
    return HttpResponse.json({ user, ...createTokens() });
  }),

  http.post('/api/accounts/register/local', async ({ request }) => {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    const { email, name } = parsed.data;
    if (users.has(email)) {
      return HttpResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    const newUser: UserRecord = {
      id: `user_${Date.now()}` as any,
      email: email as any,
      name,
      passwordHash: parsed.data.password,
      role: 'ACCOUNT_OWNER',
      verified: false,
    };
    users.set(email, newUser);
    return HttpResponse.json({ user: newUser, ...createTokens() }, { status: 201 });
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: 'Invalid email' }, { status: 400 });
    }
    const user = users.get(parsed.data.email);
    if (user) {
      const token = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      user.resetToken = token as any;
      user.resetTokenExpiry = Date.now() + 3600000;
      console.log(`[MSW] Reset token for ${parsed.data.email}: ${token}`);
    }
    return HttpResponse.json({ message: 'If the email exists, you will receive a reset link' });
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    const user = Array.from(users.values()).find((u) => u.resetToken === parsed.data.token);
    if (!user || !user.resetTokenExpiry || Date.now() > user.resetTokenExpiry) {
      return HttpResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    }
    user.passwordHash = parsed.data.password;
    delete user.resetToken;
    delete user.resetTokenExpiry;
    return HttpResponse.json({ message: 'Password updated successfully' });
  }),

  http.post('/api/auth/verify-email', async ({ request }) => {
    const body = await request.json();
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      return HttpResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    const user = Array.from(users.values()).find((u) => u.id === parsed.data.token);
    if (!user) {
      return HttpResponse.json({ error: 'Invalid token' }, { status: 400 });
    }
    user.verified = true;
    return HttpResponse.json({ message: 'Email verified' });
  }),

  http.post('/api/auth/refresh', () => {
    return HttpResponse.json(createTokens());
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out' });
  }),
];