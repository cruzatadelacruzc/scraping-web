import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { QueueStatsCards } from '../components/queue-stats-cards';

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

function renderCards(selected: string | null = null, onSelect = vi.fn()) {
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <QueueStatsCards selected={selected} onSelect={onSelect} />
    </QueryClientProvider>,
  );
  return onSelect;
}

const mockQueues = {
  queues: [
    { queueName: 'PRODUCTS_SCRAPING', counts: { waiting: 3, active: 1, failed: 2 } },
    { queueName: 'EMAIL_SEND_JOB', counts: { completed: 89 } },
  ],
};

describe('QueueStatsCards', () => {
  it('shows skeleton cards while loading', () => {
    server.use(http.get(`${API_BASE}/admin/queues/stats`, () => new Promise(() => undefined)));
    renderCards();
    expect(document.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(3);
  });

  it('shows error state with Retry on 500', async () => {
    server.use(
      http.get(`${API_BASE}/admin/queues/stats`, () => new HttpResponse(null, { status: 500 })),
    );
    renderCards();
    await screen.findByText('Retry');
    expect(screen.getByText('Failed to load queue stats')).toBeInTheDocument();
  });

  it('shows empty state when there are no queues', async () => {
    server.use(http.get(`${API_BASE}/admin/queues/stats`, () => HttpResponse.json({ queues: [] })));
    renderCards();
    await screen.findByText('No queues registered');
  });

  it('renders one card per queue with counts and calls onSelect on click', async () => {
    server.use(http.get(`${API_BASE}/admin/queues/stats`, () => HttpResponse.json(mockQueues)));
    const onSelect = renderCards();

    await screen.findByText('PRODUCTS_SCRAPING');
    expect(screen.getByText('EMAIL_SEND_JOB')).toBeInTheDocument();
    expect(screen.getByText('failed')).toBeInTheDocument();

    fireEvent.click(screen.getByText('PRODUCTS_SCRAPING'));
    expect(onSelect).toHaveBeenCalledWith('PRODUCTS_SCRAPING');
  });

  it('marks the selected card with aria-pressed', async () => {
    server.use(http.get(`${API_BASE}/admin/queues/stats`, () => HttpResponse.json(mockQueues)));
    renderCards('PRODUCTS_SCRAPING');

    await screen.findByText('PRODUCTS_SCRAPING');
    const pressed = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-pressed') === 'true');
    expect(pressed).toHaveLength(1);
  });
});
