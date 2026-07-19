import type { ReactNode } from 'react';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { useGetJobDetail } from '../hooks/useGetJobDetail';
import { useGetQueueJobs } from '../hooks/useGetQueueJobs';
import { useGetQueues } from '../hooks/useGetQueues';

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

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useGetQueues', () => {
  it('fetches all queue stats and maps them to view models', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/stats`, () =>
        HttpResponse.json({
          queues: [{ queueName: 'PRODUCTS_SCRAPING', counts: { waiting: 2, failed: 1 } }],
        }),
      ),
    );

    const { result } = renderHook(() => useGetQueues(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.[0].name).toBe('PRODUCTS_SCRAPING');
    expect(result.current.data?.[0].failedCount).toBe(1);
    expect(result.current.data?.[0].hasFailures).toBe(true);
  });
});

describe('useGetQueueJobs', () => {
  it('does not fetch while queueName is null', () => {
    const { result } = renderHook(() => useGetQueueJobs(null, 'all'), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('passes limit and status as query params and maps rows', async () => {
    const captured: string[] = [];
    server.use(
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`, ({ request }) => {
        captured.push(request.url);
        return HttpResponse.json({
          jobs: [{ id: '101', name: 'scrape-category', status: 'failed', attemptsMade: 3 }],
        });
      }),
    );

    const { result } = renderHook(() => useGetQueueJobs('PRODUCTS_SCRAPING', 'failed'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(captured[0]).toContain('limit=20');
    expect(captured[0]).toContain('status=failed');
    expect(result.current.data?.[0].statusVariant).toBe('danger');
  });

  it('omits the status param when the filter is "all"', async () => {
    const captured: string[] = [];
    server.use(
      http.get(`${API_BASE}/admin/queues/EMAIL_SEND_JOB/jobs`, ({ request }) => {
        captured.push(request.url);
        return HttpResponse.json({ jobs: [] });
      }),
    );

    const { result } = renderHook(() => useGetQueueJobs('EMAIL_SEND_JOB', 'all'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(captured[0]).not.toContain('status=');
  });
});

describe('useGetJobDetail', () => {
  it('does not fetch until both queueName and jobId are set', () => {
    const { result } = renderHook(() => useGetJobDetail('PRODUCTS_SCRAPING', null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('fetches and maps the job detail', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs/101`, () =>
        HttpResponse.json({
          id: '101',
          name: 'scrape-category',
          status: 'failed',
          attemptsMade: 3,
          failedReason: 'Navigation timeout',
          data: { url: 'https://revolico.com' },
        }),
      ),
    );

    const { result } = renderHook(() => useGetJobDetail('PRODUCTS_SCRAPING', '101'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data?.failedReason).toBe('Navigation timeout');
    expect(result.current.data?.payloadJson).toContain('revolico.com');
  });
});
