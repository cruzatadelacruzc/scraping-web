import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationProvider, useNotifications } from '@shared/notifications';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { SystemAlertsWatcher } from '../components/system-alerts-watcher';

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

function Probe(): JSX.Element {
  const { notifications } = useNotifications();
  return <div data-testid="probe">{notifications.map((n) => n.title).join('|')}</div>;
}

function setup(): QueryClient {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NotificationProvider>
          <SystemAlertsWatcher />
          <Probe />
        </NotificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return queryClient;
}

describe('SystemAlertsWatcher', () => {
  it('notifies when a health service transitions connected → error', async () => {
    let healthCalls = 0;
    server.use(
      http.get(`${API_BASE}/admin/dashboard/health`, () => {
        healthCalls += 1;
        return HttpResponse.json({
          services: [{ service: 'redis', status: healthCalls === 1 ? 'connected' : 'error' }],
          timestamp: new Date().toISOString(),
        });
      }),
      http.get(`${API_BASE}/admin/queues/stats`, () => HttpResponse.json({ queues: [] })),
    );

    const queryClient = setup();

    // First fetch settles — no notification on initial snapshot
    await waitFor(() => {
      expect(healthCalls).toBe(1);
    });
    expect(screen.getByTestId('probe').textContent).toBe('');

    // Second fetch flips redis to error
    await act(async () => {
      await queryClient.refetchQueries();
    });
    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toContain('notifications.serviceDown');
    });
  });

  it('notifies when a queue accumulates new failed jobs', async () => {
    let statsCalls = 0;
    server.use(
      http.get(`${API_BASE}/admin/dashboard/health`, () =>
        HttpResponse.json({
          services: [{ service: 'redis', status: 'connected' }],
          timestamp: new Date().toISOString(),
        }),
      ),
      http.get(`${API_BASE}/admin/queues/stats`, () => {
        statsCalls += 1;
        return HttpResponse.json({
          queues: [
            {
              queueName: 'PRODUCTS_SCRAPING',
              counts: { failed: statsCalls === 1 ? 0 : 2 },
            },
          ],
        });
      }),
    );

    const queryClient = setup();

    await waitFor(() => {
      expect(statsCalls).toBe(1);
    });
    expect(screen.getByTestId('probe').textContent).toBe('');

    await act(async () => {
      await queryClient.refetchQueries();
    });
    await waitFor(() => {
      expect(screen.getByTestId('probe').textContent).toContain('notifications.jobsFailed');
    });
  });
});
