import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { QueueJobsTable } from '../components/queue-jobs-table';

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

function createTestQueryClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderTable(queueName: string | null, onSelectJob = vi.fn()) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <QueueJobsTable queueName={queueName} onSelectJob={onSelectJob} />
    </QueryClientProvider>,
  );
  return onSelectJob;
}

const mockJobs = {
  jobs: [
    {
      id: '101',
      name: 'scrape-category',
      status: 'failed',
      attemptsMade: 3,
      timestamp: 1752700100000,
      processedOn: 1752700101000,
      finishedOn: 1752700105000,
      failedReason: 'Navigation timeout of 30000 ms exceeded',
    },
  ],
};

describe('QueueJobsTable', () => {
  it('shows a hint when no queue is selected (and does not fetch)', () => {
    renderTable(null);
    expect(screen.getByText('Select a queue to inspect its recent jobs.')).toBeInTheDocument();
  });

  it('shows skeleton rows while loading', () => {
    server.use(
      http.get(
        `${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`,
        () => new Promise(() => undefined),
      ),
    );
    renderTable('PRODUCTS_SCRAPING');
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);
  });

  it('shows error state with Retry on 500', async () => {
    server.use(
      http.get(
        `${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`,
        () => new HttpResponse(null, { status: 500 }),
      ),
    );
    renderTable('PRODUCTS_SCRAPING');
    await screen.findByText('Retry');
    expect(screen.getByText('Failed to load jobs')).toBeInTheDocument();
  });

  it('shows empty state when there are no jobs', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`, () =>
        HttpResponse.json({ jobs: [] }),
      ),
    );
    renderTable('PRODUCTS_SCRAPING');
    await screen.findByText('No jobs');
  });

  it('renders rows and notifies the selected job id', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`, () =>
        HttpResponse.json(mockJobs),
      ),
    );
    const onSelectJob = renderTable('PRODUCTS_SCRAPING');

    await screen.findByText('scrape-category');
    expect(screen.getAllByText('failed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Navigation timeout of 30000 ms exceeded')).toBeInTheDocument();

    fireEvent.click(screen.getByText('101'));
    expect(onSelectJob).toHaveBeenCalledWith('101');
  });

  it('refetches with the chosen status filter', async () => {
    const captured: string[] = [];
    server.use(
      http.get(`${API_BASE}/admin/queues/PRODUCTS_SCRAPING/jobs`, ({ request }) => {
        captured.push(request.url);
        return HttpResponse.json(mockJobs);
      }),
    );
    renderTable('PRODUCTS_SCRAPING');
    await screen.findByText('scrape-category');

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'failed' } });
    await screen.findByText('scrape-category');
    expect(captured.some((url) => url.includes('status=failed'))).toBe(true);
  });
});
