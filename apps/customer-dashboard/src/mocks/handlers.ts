import { setupServer } from 'msw/node';
import { http } from 'msw';

const mockAuthSession = {
  userId: 'user-123',
  accountId: 'account-456',
  roles: ['ACCOUNT_OWNER'],
  permissions: [
    'alarms:view',
    'alarms:manage',
    'notifications:view',
    'bots:manage',
    'subscription:view',
    'subscription:manage',
    'profile:view',
    'profile:manage',
    'account:view',
    'account:manage',
  ],
  expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  accessToken: 'mock-access-token',
};

export const handlers = [
  http.post('/api/auth/login', () => {
    return Response.json(mockAuthSession);
  }),
  http.post('/api/auth/refresh', () => {
    return Response.json(mockAuthSession);
  }),
  http.post('/api/auth/logout', () => {
    return new Response(null);
  }),
  http.post('/api/accounts/register/local', () => {
    return Response.json(mockAuthSession, { status: 201 });
  }),
  http.get('/api/alarms', () => {
    return Response.json([]);
  }),
  http.get('/api/notifications', () => {
    return Response.json([]);
  }),
  http.get('/api/bots/link-code', () => {
    return Response.json({
      links: {
        telegram: { deepLink: 'https://t.me/test', expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString() },
      },
      ttlMinutes: 5,
    });
  }),
  http.get('/api/bots/status', () => {
    return Response.json({ linked: false, provider: null, externalId: null, lastActivity: null });
  }),
  http.get('/api/account', () => {
    return Response.json({ id: 'account-456', name: 'Test Account', settings: {} });
  }),
];

export const server = setupServer(...handlers);