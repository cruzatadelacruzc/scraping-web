import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000/api';

/** Backend wraps all responses in { status, message, data }. */
function envelope(data: unknown): object {
  return { status: 'success', message: 'OK', data };
}

export const handlers = [
  // Auth — POST /api/auth/login
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { username: string; password: string };
    if (
      body.username === 'admin' &&
      (body.password === 'password' || body.password === 'ChangeMe123')
    ) {
      return HttpResponse.json(
        envelope({
          token: 'mock-jwt-token',
          refreshToken: 'mock-refresh-token',
          user: {
            id: 'mock-user-1',
            email: 'admin@bazaarsentinel.dev',
            username: 'admin',
            accountId: 'mock-account-1',
            roles: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'SUPER_ADMIN' }],
          },
        }),
      );
    }
    return HttpResponse.json({ status: 'error', message: 'Invalid credentials' }, { status: 401 });
  }),

  // Auth — POST /api/auth/refresh
  http.post(`${API_BASE}/auth/refresh`, async ({ request }) => {
    const body = (await request.json()) as { refreshToken: string };
    if (body.refreshToken) {
      return HttpResponse.json(
        envelope({
          token: 'mock-refreshed-jwt-token',
          refreshToken: 'mock-refreshed-refresh-token',
          user: {
            id: 'mock-user-1',
            email: 'admin@bazaarsentinel.dev',
            username: 'admin',
            accountId: 'mock-account-1',
            roles: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'SUPER_ADMIN' }],
          },
        }),
      );
    }
    return HttpResponse.json(
      { status: 'error', message: 'Invalid refresh token' },
      { status: 400 },
    );
  }),

  // Admin — GET /api/admin/dashboard
  http.get(`${API_BASE}/admin/dashboard`, () => {
    return HttpResponse.json(
      envelope({
        productCount: 12840,
        categoriesBreakdown: [
          { category: 'electronics', count: 4200 },
          { category: 'vehicles', count: 3100 },
          { category: 'realestate', count: 2800 },
          { category: 'services', count: 2740 },
        ],
        totalAccounts: 42,
        totalUsers: 156,
        activeSubscriptions: 38,
        recentProducts: [],
      }),
    );
  }),

  // Admin — GET /api/admin/dashboard/health
  http.get(`${API_BASE}/admin/dashboard/health`, () => {
    return HttpResponse.json(
      envelope({
        services: [
          { service: 'mongodb', status: 'connected' },
          { service: 'postgres', status: 'connected' },
          { service: 'redis', status: 'connected' },
        ],
        timestamp: new Date().toISOString(),
      }),
    );
  }),

  // Admin — GET /api/admin/dashboard/enrichment
  http.get(`${API_BASE}/admin/dashboard/enrichment`, () => {
    return HttpResponse.json(
      envelope({
        startedAt: new Date().toISOString(),
        totalEnrichments: 5432,
        enrichmentHashSkips: 1200,
        enrichmentHashSkipRate: 0.22,
        ruleHighConfidence: 3400,
        ruleHighConfidenceRate: 0.78,
        cacheHits: 3800,
        cacheMisses: 567,
        cacheHitRate: 0.87,
        llmCalls: 342,
        llmFailures: 12,
        llmFailureRate: 0.035,
        llmPromptCacheHitTokens: 450000,
        llmPromptCacheMissTokens: 120000,
        llmCompletionTokens: 890000,
        llmCacheHitRate: 0.35,
        estimatedSavingsUSD: 342.5,
        costPerMillionTokens: 15.0,
      }),
    );
  }),

  // Admin — GET /api/admin/accounts
  http.get(`${API_BASE}/admin/accounts`, () => {
    return HttpResponse.json(
      envelope({
        accounts: [
          {
            id: '1',
            name: 'Acme Corp',
            userCount: 12,
            subscriptionCount: 2,
            alarmCount: 5,
            createdAt: '2024-01-15T10:30:00Z',
            updatedAt: '2024-06-01T10:30:00Z',
          },
          {
            id: '2',
            name: 'Globex Inc',
            userCount: 3,
            subscriptionCount: 1,
            alarmCount: 0,
            createdAt: '2024-03-20T10:30:00Z',
            updatedAt: '2024-05-10T10:30:00Z',
          },
          {
            id: '3',
            name: 'Initech',
            userCount: 0,
            subscriptionCount: 0,
            alarmCount: 0,
            createdAt: '2023-11-01T10:30:00Z',
            updatedAt: '2024-07-01T10:30:00Z',
          },
        ],
        total: 3,
        skip: 0,
        limit: 20,
      }),
    );
  }),

  // Admin — GET /api/admin/queues/stats
  http.get(`${API_BASE}/admin/queues/stats`, () => {
    return HttpResponse.json(
      envelope({
        queues: [
          {
            queueName: 'PRODUCTS_SCRAPING',
            counts: { waiting: 3, active: 1, completed: 1240, failed: 2, delayed: 0 },
          },
          {
            queueName: 'PRODUCT_STORAGE',
            counts: { waiting: 0, active: 0, completed: 5321, failed: 0, delayed: 0 },
          },
          {
            queueName: 'EMAIL_SEND_JOB',
            counts: { waiting: 1, active: 0, completed: 89, failed: 1, delayed: 2 },
          },
        ],
      }),
    );
  }),

  // Admin — GET /api/admin/queues/:name/jobs
  http.get(`${API_BASE}/admin/queues/:name/jobs`, () => {
    return HttpResponse.json(
      envelope({
        jobs: [
          {
            id: '101',
            name: 'scrape-category',
            status: 'completed',
            attemptsMade: 1,
            timestamp: 1752700000000,
            processedOn: 1752700001000,
            finishedOn: 1752700009000,
            data: { url: 'https://revolico.com/categoria/celulares' },
          },
          {
            id: '102',
            name: 'scrape-category',
            status: 'failed',
            attemptsMade: 3,
            timestamp: 1752700100000,
            processedOn: 1752700101000,
            finishedOn: 1752700105000,
            failedReason: 'Navigation timeout of 30000 ms exceeded',
            data: { url: 'https://revolico.com/categoria/autos' },
          },
        ],
      }),
    );
  }),

  // Admin — GET /api/admin/queues/:name/jobs/:id
  http.get(`${API_BASE}/admin/queues/:name/jobs/:id`, ({ params }) => {
    return HttpResponse.json(
      envelope({
        id: String(params.id),
        name: 'scrape-category',
        status: 'failed',
        attemptsMade: 3,
        timestamp: 1752700100000,
        processedOn: 1752700101000,
        finishedOn: 1752700105000,
        failedReason: 'Navigation timeout of 30000 ms exceeded',
        data: { url: 'https://revolico.com/categoria/autos', pages: 5 },
        returnValue: null,
      }),
    );
  }),
];
