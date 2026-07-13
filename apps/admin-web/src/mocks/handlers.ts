import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000/api';

export const handlers = [
  // Auth — POST /api/auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === 'admin@bazaarsentinel.dev' && body.password === 'password') {
      return HttpResponse.json({
        accessToken: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'mock-user-1',
          email: 'admin@bazaarsentinel.dev',
          accountId: 'mock-account-1',
          roles: [{ id: 'role-1', name: 'SUPER_ADMIN' }],
        },
      });
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 });
  }),

  // Auth — POST /api/auth/refresh
  http.post(`${API_BASE}/auth/refresh`, () => {
    return HttpResponse.json({
      accessToken: 'mock-refreshed-jwt-token',
      refreshToken: 'mock-refreshed-refresh-token',
    });
  }),

  // Admin — GET /api/admin/dashboard
  http.get(`${API_BASE}/admin/dashboard`, () => {
    return HttpResponse.json({
      totalAccounts: 42,
      activeUsers: 156,
      productsScraped: 12840,
      alarmsFiring: 3,
      recentActivity: [],
    });
  }),

  // Admin — GET /api/admin/dashboard/health
  http.get(`${API_BASE}/admin/dashboard/health`, () => {
    return HttpResponse.json({
      db: 'healthy',
      redis: 'healthy',
      scraperUptime: 99.8,
    });
  }),

  // Admin — GET /api/admin/dashboard/enrichment
  http.get(`${API_BASE}/admin/dashboard/enrichment`, () => {
    return HttpResponse.json({
      cacheHitRate: 87.5,
      tokenConsumption: 125000,
      costSavings: 342.5,
    });
  }),

  // Admin — GET /api/admin/accounts
  http.get(`${API_BASE}/admin/accounts`, () => {
    return HttpResponse.json({
      items: [
        { id: '1', name: 'Acme Corp', status: 'active', ownerEmail: 'admin@acme.dev', userCount: 12, planName: 'Pro', createdAt: '2024-01-15T10:30:00Z', updatedAt: '2024-06-01T10:30:00Z' },
        { id: '2', name: 'Globex Inc', status: 'suspended', ownerEmail: 'ceo@globex.dev', userCount: 3, planName: 'Basic', createdAt: '2024-03-20T10:30:00Z', updatedAt: '2024-05-10T10:30:00Z' },
        { id: '3', name: 'Initech', status: 'deleted', ownerEmail: 'admin@initech.dev', userCount: 0, planName: 'Starter', createdAt: '2023-11-01T10:30:00Z', updatedAt: '2024-07-01T10:30:00Z' },
      ],
      total: 3,
    });
  }),
];
