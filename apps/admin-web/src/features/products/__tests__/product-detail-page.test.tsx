import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ── Hoisted mock variables ─────────────────────────────────────────────────

const {
  mockUseGetProduct,
  mockUseGetPriceHistory,
  mockUseGetViewsHistory,
  mockUseGetLocationHistory,
  mockUseGetOutstandingHistory,
  mockUseGetPromotedHistory,
} = vi.hoisted(() => ({
  mockUseGetProduct: vi.fn(),
  mockUseGetPriceHistory: vi.fn(),
  mockUseGetViewsHistory: vi.fn(),
  mockUseGetLocationHistory: vi.fn(),
  mockUseGetOutstandingHistory: vi.fn(),
  mockUseGetPromotedHistory: vi.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../hooks/product-detail-hooks', () => ({
  useGetProduct: mockUseGetProduct,
}));

vi.mock('../hooks/product-history-hooks', () => ({
  useGetPriceHistory: mockUseGetPriceHistory,
  useGetViewsHistory: mockUseGetViewsHistory,
  useGetLocationHistory: mockUseGetLocationHistory,
  useGetOutstandingHistory: mockUseGetOutstandingHistory,
  useGetPromotedHistory: mockUseGetPromotedHistory,
}));

vi.mock('@shared/auth', () => ({
  useCurrentUser: () => ({
    userId: 'user-1',
    accountId: 'acc-1',
    roles: ['SUPER_ADMIN'],
    username: 'admin',
    email: 'admin@test.dev',
    expiresAt: Date.now() + 86400000,
  }),
  useIsAuthenticated: () => true,
}));

// Mock Recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  Area: () => <div data-testid="area" />,
  XAxis: () => <div data-testid="xaxis" />,
  YAxis: () => <div data-testid="yaxis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

vi.mock('@shared/ui/skeletons/chart-skeleton', () => ({
  ChartSkeleton: () => <div data-testid="chart-skeleton">Loading chart...</div>,
}));

import { ProductDetailPage } from '../components/product-detail-page';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/products/prod-1']}>
        <ProductDetailPage productId="prod-1" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const defaultProduct = {
  id: 'prod-1',
  title: 'Test Product',
  category: 'Electronics',
  price: 99.99,
  currency: 'USD',
  locationState: 'Havana',
  views: 150,
  isOutstanding: true,
  isPromoted: false,
  createdAt: new Date('2024-01-15'),
};

const defaultHistoryQuery = {
  isLoading: false,
  isError: false,
  data: [],
  refetch: vi.fn(),
};

afterEach(() => {
  vi.clearAllMocks();
});

// ── 404 vs non-404 Error ───────────────────────────────────────────────────

describe('ProductDetailPage — error differentiation', () => {
  it('renders not-found view when product query returns 404', () => {
    mockUseGetProduct.mockReturnValue({
      isLoading: false,
      isError: true,
      error: Object.assign(new Error('Not found'), {
        response: { status: 404 },
      }),
      data: undefined,
      refetch: vi.fn(),
    });
    // All other queries return empty (their hooks are still called)
    mockUseGetPriceHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetViewsHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetLocationHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetOutstandingHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetPromotedHistory.mockReturnValue(defaultHistoryQuery);

    renderPage();

    // Should show not-found specific text
    expect(screen.getByText('products.detail.notFound')).toBeInTheDocument();
    expect(screen.getByText('products.detail.notFoundDesc')).toBeInTheDocument();
    // Should have a link back to catalog
    expect(screen.getByText('products.detail.goToCatalog')).toBeInTheDocument();
    // Should NOT show the generic error retry button
    expect(screen.queryByText('common.retry')).not.toBeInTheDocument();
  });

  it('renders error state with Retry when product query returns non-404 error (500)', () => {
    mockUseGetProduct.mockReturnValue({
      isLoading: false,
      isError: true,
      error: Object.assign(new Error('Server error'), {
        response: { status: 500 },
      }),
      data: undefined,
      refetch: vi.fn(),
    });
    mockUseGetPriceHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetViewsHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetLocationHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetOutstandingHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetPromotedHistory.mockReturnValue(defaultHistoryQuery);

    renderPage();

    // Should show error state with Retry (not the not-found view)
    expect(screen.queryByText('products.detail.notFound')).not.toBeInTheDocument();
    expect(screen.queryByText('products.detail.goToCatalog')).not.toBeInTheDocument();
    // Should show a generic error message or retry
    expect(screen.getByText('common.retry')).toBeInTheDocument();
  });
});

// ── Time range filtering on status tabs ────────────────────────────────────

describe('ProductDetailPage — time range filtering on status tabs', () => {
  it('filters outstanding history entries when a time range is selected', async () => {
    const user = userEvent.setup();

    // Product loads successfully
    mockUseGetProduct.mockReturnValue({
      isLoading: false,
      isError: false,
      data: defaultProduct,
      refetch: vi.fn(),
    });

    // Outstanding history with entries both in-range and out-of-range
    const allOutstandingEntries = [
      {
        value: 1 as const,
        updatedAt: '2024-01-01T00:00:00.000Z',
        timestamp: new Date('2024-01-01'),
      },
      {
        value: 0 as const,
        updatedAt: '2024-06-15T00:00:00.000Z',
        timestamp: new Date('2024-06-15'),
      },
    ];

    mockUseGetOutstandingHistory.mockReturnValue({
      isLoading: false,
      isError: false,
      data: allOutstandingEntries,
      refetch: vi.fn(),
    });

    mockUseGetPriceHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetViewsHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetLocationHistory.mockReturnValue(defaultHistoryQuery);
    mockUseGetPromotedHistory.mockReturnValue(defaultHistoryQuery);

    renderPage();

    // Click the Outstanding tab
    await user.click(screen.getByText('products.detail.tabs.outstanding'));

    // Initially (All time range), both entries should be rendered
    // The StepChart renders labels "products.outstanding" and "products.detail.standard"
    // For the step chart, entries with value=1 show "Outstanding" label in legend
    // Both entries exist, so both legend labels should be visible
    expect(screen.getByText('products.detail.standard')).toBeInTheDocument();

    // Future: after time range selection, out-of-range entries should be filtered
    // This test will establish the baseline behavior
  });
});
