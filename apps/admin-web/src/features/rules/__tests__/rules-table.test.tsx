import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { RulesTable } from '../components/rules-table';

// ── MSW Server ────────────────────────────────────────────────────────────────

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

// ── i18n mock ──────────────────────────────────────────────────────────────────
// Returns the fallback/defaultValue string when it is a string, otherwise the key.
// This lets tests assert on the rendered fallback text (the second arg to t()).

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>): string => {
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

// ── Test helpers ───────────────────────────────────────────────────────────────

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderTable(queryClient?: QueryClient) {
  const qc = queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <RulesTable />
    </QueryClientProvider>,
  );
}

// ── Data fixtures ──────────────────────────────────────────────────────────────

const mockRules = [
  {
    id: '1',
    ruleKey: 'brands',
    values: ['apple', 'samsung'],
    version: 1,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: '2',
    ruleKey: 'colors',
    values: ['red'],
    version: 2,
    enabled: false,
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-03T00:00:00.000Z',
  },
];

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('RulesTable', () => {
  describe('loading state', () => {
    it('shows skeleton rows while data is loading', () => {
      // Handler that never resolves — keeps the query in loading state
      server.use(http.get(`${API_BASE}/admin/rules`, () => new Promise(() => undefined)));

      renderTable();

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('empty state', () => {
    it('shows "No rules yet" and a "New Rule" button when the API returns an empty list', async () => {
      server.use(http.get(`${API_BASE}/admin/rules`, () => HttpResponse.json({ rules: [] })));

      renderTable();

      await screen.findByText('No rules yet');
      expect(screen.getByText('New Rule')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows "Retry" button and error message when the API returns 500', async () => {
      server.use(
        http.get(`${API_BASE}/admin/rules`, () => new HttpResponse(null, { status: 500 })),
      );

      renderTable();

      await screen.findByText('Retry');
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('data state', () => {
    it('renders rule keys and "New Rule" button from the API response', async () => {
      server.use(
        http.get(`${API_BASE}/admin/rules`, () => HttpResponse.json({ rules: mockRules })),
      );

      renderTable();

      // Wait for the table to load by waiting for a known rule key
      await screen.findByText('brands');

      expect(screen.getByText('brands')).toBeInTheDocument();
      expect(screen.getByText('colors')).toBeInTheDocument();
      expect(screen.getByText('New Rule')).toBeInTheDocument();
    });
  });
});
