import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { QueuesDashboard } from '../components/queues-dashboard';

const API_BASE = 'http://localhost:3000/api';

const server = setupServer();

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>): string => {
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

const mockJob = {
  id: '101',
  name: 'scrape-category',
  status: 'failed',
  attemptsMade: 3,
  timestamp: 1752700100000,
  processedOn: 1752700101000,
  finishedOn: 1752700105000,
  failedReason: 'Navigation timeout of 30000 ms exceeded',
  data: { url: 'https://revolico.com/categoria/autos' },
};

describe('QueuesDashboard', () => {
  it('drills down: queue card → jobs table → job detail drawer', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/stats`, () =>
        HttpResponse.json({
          queues: [{ queueName: 'PRODUCTS_SCRAPING', counts: { waiting: 2, failed: 1 } }],
        }),
      ),
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`, () =>
        HttpResponse.json({ jobs: [mockJob] }),
      ),
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs/101`, () =>
        HttpResponse.json(mockJob),
      ),
    );

    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <QueuesDashboard />
      </QueryClientProvider>,
    );

    // 1. Cards load
    await screen.findByText('PRODUCTS_SCRAPING');

    // 2. Select the queue → jobs table loads
    fireEvent.click(screen.getByText('PRODUCTS_SCRAPING'));
    await screen.findByText('scrape-category');

    // 3. Open the job → drawer shows detail + payload JSON
    fireEvent.click(screen.getByText('101'));
    await screen.findByText('Job detail');
    expect(await screen.findByText(/revolico\.com/)).toBeInTheDocument();
  });
});
