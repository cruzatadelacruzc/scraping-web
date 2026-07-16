import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock ResizeObserver for Recharts ResponsiveContainer (jsdom doesn't provide it)
class ResizeObserverMock {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Hoisted mock variables
const { mockGetStats } = vi.hoisted(() => ({
  mockGetStats: vi.fn(),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: vi.fn() },
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) => {
      if (vars) {
        let result = key;
        for (const [k, v] of Object.entries(vars)) {
          result = result.replace(`{{${k}}}`, String(v));
        }
        return result;
      }
      return key;
    },
  }),
}));

// Mock auth hooks
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
  useLogin: () => vi.fn(),
  useLogout: () => vi.fn(),
  useAuthLoading: () => false,
}));

// Mock the stats service
vi.mock('../services/products-stats-service', () => ({
  productsStatsService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getStats: (...args: unknown[]) => mockGetStats(...args),
  },
}));

import { ProductsStatsPage } from '../components/products-stats-page';
import type { ProductStatsDTO } from '../services/products-stats-service';

const mockStatsData: ProductStatsDTO = {
  totalProducts: 12840,
  byCategory: [
    { category: 'Electronics', count: 4200 },
    { category: 'Vehicles', count: 3100 },
    { category: 'Real Estate', count: 2800 },
    { category: 'Services', count: 2740 },
  ],
  byState: [
    { state: 'Havana', count: 5200 },
    { state: 'Matanzas', count: 2800 },
    { state: 'Santiago de Cuba', count: 1900 },
    { state: 'Villa Clara', count: 1200 },
  ],
  outstandingCount: 423,
  promotedCount: 89,
  lastScrapedAt: '2026-07-15T14:30:00.000Z',
  priceRange: { min: 50, max: 25000 },
  enrichedCount: 8200,
  unenrichedCount: 4640,
};

const mockEmptyStats: ProductStatsDTO = {
  totalProducts: 0,
  byCategory: [],
  byState: [],
  outstandingCount: 0,
  promotedCount: 0,
  lastScrapedAt: null,
  priceRange: { min: 0, max: 0 },
  enrichedCount: 0,
  unenrichedCount: 0,
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

interface RenderOptions {
  queryClient?: QueryClient;
}

function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const qc = options?.queryClient ?? createTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductsStatsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStats.mockResolvedValue({
      data: mockStatsData,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeletons initially', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockGetStats.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<ProductsStatsPage />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders page title during loading', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockGetStats.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<ProductsStatsPage />);

      expect(screen.getByText('products.stats.title')).toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockGetStats.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<ProductsStatsPage />);

      const errorMessage = await screen.findByText('Network error', {}, { timeout: 2000 });
      expect(errorMessage).toBeInTheDocument();
    });

    it('shows translated error fallback when error is not an Error instance', async () => {
      mockGetStats.mockRejectedValue('Something went wrong');
      renderWithProviders(<ProductsStatsPage />);

      const errorMessage = await screen.findByText(
        'products.stats.error.message',
        {},
        { timeout: 2000 },
      );
      expect(errorMessage).toBeInTheDocument();
    });

    it('renders a retry button in error state', async () => {
      mockGetStats.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<ProductsStatsPage />);

      const retryButton = await screen.findByText('common.retry', {}, { timeout: 2000 });
      expect(retryButton).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      mockGetStats.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('common.retry', {}, { timeout: 2000 });

      mockGetStats.mockClear();
      mockGetStats.mockResolvedValue({
        data: mockEmptyStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      const retryButton = screen.getByText('common.retry');
      retryButton.click();

      await vi.waitFor(
        () => {
          expect(mockGetStats).toHaveBeenCalled();
        },
        { timeout: 2000, interval: 50 },
      );
    });
  });

  describe('empty state', () => {
    it('shows empty state when stats return zero products', async () => {
      mockGetStats.mockResolvedValue({
        data: mockEmptyStats,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      const emptyTitle = await screen.findByText(
        'products.stats.empty.title',
        {},
        { timeout: 2000 },
      );
      expect(emptyTitle).toBeInTheDocument();
      expect(screen.getByText('products.stats.empty.description')).toBeInTheDocument();
    });

    it('shows chart empty state key when bar chart has no data', async () => {
      // Edge case: totalProducts > 0 but byCategory is empty
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          totalProducts: 1,
          byCategory: [],
          byState: [{ state: 'Havana', count: 1 }],
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      expect(
        await screen.findByText('products.stats.chartEmpty', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });
  });

  describe('data render', () => {
    it('renders page title', async () => {
      renderWithProviders(<ProductsStatsPage />);

      expect(
        await screen.findByText('products.stats.title', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });

    it('renders KPI section with 4 KPI cards', async () => {
      renderWithProviders(<ProductsStatsPage />);

      expect(
        await screen.findByText('products.stats.totalProducts', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('products.stats.outstanding', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('products.stats.promoted', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('products.stats.enrichedCount', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });

    it('renders KPI values formatted', async () => {
      renderWithProviders(<ProductsStatsPage />);
      expect(await screen.findByText('12,840', {}, { timeout: 2000 })).toBeInTheDocument();
      expect(await screen.findByText('423', {}, { timeout: 2000 })).toBeInTheDocument();
      expect(await screen.findByText('89', {}, { timeout: 2000 })).toBeInTheDocument();
      expect(await screen.findByText('8,200', {}, { timeout: 2000 })).toBeInTheDocument();
    });

    it('displays bar chart sections with correct titles', async () => {
      renderWithProviders(<ProductsStatsPage />);
      expect(
        await screen.findByText('products.stats.byCategory', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
      expect(
        await screen.findByText('products.stats.byState', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });

    it('renders bar chart with accessible descriptions', async () => {
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('12,840', {}, { timeout: 2000 });

      const byCategoryDesc = screen.getByLabelText('products.stats.chartDesc.byCategory');
      expect(byCategoryDesc).toBeInTheDocument();

      const byStateDesc = screen.getByLabelText('products.stats.chartDesc.byState');
      expect(byStateDesc).toBeInTheDocument();
    });

    it('displays price range stat tile', async () => {
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('12,840', {}, { timeout: 2000 });

      expect(screen.getByText('products.stats.priceRange')).toBeInTheDocument();
      expect(screen.getByText('$50 — $25,000')).toBeInTheDocument();
    });

    it('displays enrichment meter section', async () => {
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('12,840', {}, { timeout: 2000 });

      expect(screen.getByText('64%')).toBeInTheDocument();
      expect(
        await screen.findByText(/8,200 enriched of 12,840 total/, {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });

    it('displays last scraped timestamp', async () => {
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('12,840', {}, { timeout: 2000 });

      expect(screen.getByText(/products\.stats\.lastScraped/)).toBeInTheDocument();
    });

    it('does not display last scraped when null', async () => {
      mockGetStats.mockResolvedValue({
        data: { ...mockStatsData, lastScrapedAt: null },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('12,840', {}, { timeout: 2000 });

      expect(screen.queryByText(/products\.stats\.lastScraped/)).not.toBeInTheDocument();
    });

    it('renders enrichment meter with proper aria attributes', async () => {
      renderWithProviders(<ProductsStatsPage />);

      const progressbar = await screen.findByRole(
        'progressbar',
        { name: /64% of products enriched/ },
        { timeout: 2000 },
      );
      expect(progressbar).toBeInTheDocument();
      expect(progressbar).toHaveAttribute('aria-valuenow', '64');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  describe('enrichment calculation edge cases', () => {
    it('handles zero total enrichment gracefully (0/0 guard)', async () => {
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          enrichedCount: 0,
          unenrichedCount: 0,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);
      await screen.findByText('0', {}, { timeout: 2000 });

      expect(screen.getByText('0%')).toBeInTheDocument();
      expect(screen.getByText(/0 enriched of 0 total/)).toBeInTheDocument();
    });

    it('handles 100% enrichment correctly', async () => {
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          enrichedCount: 500,
          unenrichedCount: 0,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      expect(await screen.findByText('100%', {}, { timeout: 2000 })).toBeInTheDocument();
      const progressbar = await screen.findByRole(
        'progressbar',
        { name: /100% of products enriched/ },
        { timeout: 2000 },
      );
      expect(progressbar).toHaveAttribute('aria-valuenow', '100');
    });

    it('rounds enrichment percentage properly', async () => {
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          enrichedCount: 1,
          unenrichedCount: 3,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      expect(await screen.findByText('25%', {}, { timeout: 2000 })).toBeInTheDocument();
    });
  });

  describe('price range edge cases', () => {
    it('handles zero price range', async () => {
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          priceRange: { min: 0, max: 0 },
          totalProducts: 1,
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      expect(await screen.findByText('$0 — $0', {}, { timeout: 2000 })).toBeInTheDocument();
    });

    it('handles large price values with locale formatting', async () => {
      mockGetStats.mockResolvedValue({
        data: {
          ...mockStatsData,
          priceRange: { min: 1500, max: 999999 },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsStatsPage />);

      expect(
        await screen.findByText('$1,500 — $999,999', {}, { timeout: 2000 }),
      ).toBeInTheDocument();
    });
  });
});
