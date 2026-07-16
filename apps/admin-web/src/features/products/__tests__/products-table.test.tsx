import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Hoisted mock variables — must be defined before vi.mock (which is hoisted)
const { mockList } = vi.hoisted(() => ({
  mockList: vi.fn(),
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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
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

// Mock the products service
vi.mock('../services/products-service', () => ({
  productsService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    list: (...args: unknown[]) => mockList(...args),
  },
}));

import { ProductsTable } from '../components/products-table';

const mockProducts = [
  {
    _id: 'prod-1',
    ID: 'ABC123',
    category: 'Electronics',
    subcategory: 'Phones',
    url: 'https://example.com/phone',
    description: 'iPhone 14 Pro Max 256GB',
    cost: '800',
    currency: 'USD',
    price: 899.99,
    isOutstanding: true,
    isPromoted: false,
    location: { state: 'Havana', municipality: 'Plaza' },
    views: 150,
    seller: { name: 'TechStore' },
    createdAt: '2024-01-15T00:00:00.000Z',
    updatedAt: '2024-06-01T00:00:00.000Z',
    hasEnrichment: true,
    hasAttributes: true,
    hasAnalytics: false,
    tags: ['phone', 'apple'],
    imageURL: 'https://example.com/img.jpg',
  },
  {
    _id: 'prod-2',
    ID: 'DEF456',
    category: 'Vehicles',
    subcategory: 'Cars',
    url: 'https://example.com/car',
    description: 'Toyota Corolla 2020',
    cost: '15000',
    currency: 'USD',
    price: 14500,
    isOutstanding: false,
    isPromoted: true,
    location: { state: 'Matanzas', municipality: 'Varadero' },
    views: 320,
    seller: { name: 'AutoDealer' },
    createdAt: '2024-03-20T00:00:00.000Z',
    updatedAt: '2024-06-10T00:00:00.000Z',
    hasEnrichment: false,
    hasAttributes: false,
    hasAnalytics: false,
    tags: ['car', 'toyota'],
    imageURL: 'https://example.com/car.jpg',
  },
];

const mockListResponse = {
  data: mockProducts,
  meta: {
    total: 2,
    skip: 0,
    limit: 20,
    hasMore: false,
  },
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

// Helper to wait for the loading state to resolve to the data state
async function waitForData() {
  await screen.findByText('products.table.caption', {}, { timeout: 2000 });
}

describe('ProductsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: mockListResponse,
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
    it('shows loading skeleton initially', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      mockList.mockReturnValue(new Promise(() => {}));
      renderWithProviders(<ProductsTable />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockList.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<ProductsTable />);

      const errorMessage = await screen.findByText('Network error', {}, { timeout: 2000 });
      expect(errorMessage).toBeInTheDocument();
    });

    it('shows translated error when no Error instance', async () => {
      mockList.mockRejectedValue('Something went wrong');
      renderWithProviders(<ProductsTable />);

      const errorMessage = await screen.findByText('products.error.message', {}, { timeout: 2000 });
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no products exist', async () => {
      mockList.mockResolvedValue({
        data: { data: [], meta: { total: 0, skip: 0, limit: 20, hasMore: false } },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);

      const emptyTitle = await screen.findByText('products.empty.title', {}, { timeout: 2000 });
      expect(emptyTitle).toBeInTheDocument();
      expect(screen.getByText('products.empty.description')).toBeInTheDocument();
    });
  });

  describe('data render', () => {
    it('renders table with correct column headers', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      expect(screen.getByText('products.table.title')).toBeInTheDocument();
      expect(screen.getByText('products.table.category')).toBeInTheDocument();
      expect(screen.getByText('products.table.price')).toBeInTheDocument();
      expect(screen.getByText('products.table.location')).toBeInTheDocument();
      expect(screen.getByText('products.table.views')).toBeInTheDocument();
      expect(screen.getByText('products.table.status')).toBeInTheDocument();
      expect(screen.getByText('products.table.created')).toBeInTheDocument();
    });

    it('renders product data in table rows', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      // Product descriptions should be visible
      expect(screen.getByText('iPhone 14 Pro Max 256GB')).toBeInTheDocument();
      expect(screen.getByText('Toyota Corolla 2020')).toBeInTheDocument();

      // Prices should render (font-mono)
      const priceElements = screen.getAllByText(/899\.99|14500/);
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it('has a visually hidden caption', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      const caption = screen.getByText('products.table.caption');
      expect(caption).toBeInTheDocument();
      expect(caption.className).toContain('sr-only');
    });

    it('displays outstanding badge for outstanding products', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      expect(screen.getByText('products.outstanding')).toBeInTheDocument();
    });

    it('displays promoted badge for promoted products', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      expect(screen.getByText('products.promoted')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('renders a search input with the correct placeholder', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      expect(searchInput).toBeInTheDocument();
    });

    it('debounces search input before triggering query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductsTable />);
      await waitForData();

      mockList.mockClear();

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      await user.type(searchInput, 'iPhone');

      await vi.waitFor(
        () => {
          expect(mockList).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'iPhone', skip: 0, limit: 20 }),
          );
        },
        { timeout: 1000, interval: 50 },
      );
    });

    it('resets to page 1 when search changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductsTable />);
      await waitForData();

      mockList.mockClear();

      const searchInput = screen.getByPlaceholderText('products.searchPlaceholder');
      await user.type(searchInput, 'iPhone');

      await vi.waitFor(
        () => {
          const calls = mockList.mock.calls;
          const lastCall = calls[calls.length - 1] as [{ skip: number; search: string }];
          expect(lastCall[0].skip).toBe(0);
        },
        { timeout: 1000, interval: 50 },
      );
    });
  });

  describe('filters', () => {
    it('renders filter controls', async () => {
      renderWithProviders(<ProductsTable />);
      await waitForData();

      // Category filter input
      expect(
        screen.getByPlaceholderText('products.filters.categoryPlaceholder'),
      ).toBeInTheDocument();
      // Min price input
      expect(screen.getByPlaceholderText('products.filters.minPrice')).toBeInTheDocument();
      // Max price input
      expect(screen.getByPlaceholderText('products.filters.maxPrice')).toBeInTheDocument();
    });

    it('includes filter params in query when filters are set', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductsTable />);
      await waitForData();

      mockList.mockClear();

      const categoryInput = screen.getByPlaceholderText('products.filters.categoryPlaceholder');
      await user.type(categoryInput, 'Electronics');

      await vi.waitFor(
        () => {
          expect(mockList).toHaveBeenCalledWith(
            expect.objectContaining({ category: 'Electronics', skip: 0, limit: 20 }),
          );
        },
        { timeout: 1000, interval: 50 },
      );
    });

    it('resets to page 1 when filters change', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProductsTable />);
      await waitForData();

      mockList.mockClear();

      const minPriceInput = screen.getByPlaceholderText('products.filters.minPrice');
      await user.type(minPriceInput, '100');

      await vi.waitFor(
        () => {
          const calls = mockList.mock.calls;
          const lastCall = calls[calls.length - 1] as [{ skip: number; minPrice: number }];
          expect(lastCall[0].skip).toBe(0);
        },
        { timeout: 1000, interval: 50 },
      );
    });
  });

  describe('pagination', () => {
    const paginatedProducts = Array.from({ length: 25 }, (_, i) => ({
      _id: `prod-${String(i + 1)}`,
      category: 'General',
      url: `https://example.com/item-${String(i + 1)}`,
      description: `Product ${String(i + 1)}`,
      cost: String((i + 1) * 10),
      currency: 'USD',
      price: (i + 1) * 10,
      isOutstanding: false,
      location: { state: 'Havana' },
      views: i * 5,
      seller: { name: 'Seller' },
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      hasEnrichment: false,
      hasAttributes: false,
      hasAnalytics: false,
      tags: [],
    }));

    it('renders pagination controls', async () => {
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(0, 20),
          meta: { total: 25, skip: 0, limit: 20, hasMore: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);
      await waitForData();

      expect(screen.getByText('products.pagination.prev')).toBeInTheDocument();
      expect(screen.getByText('products.pagination.next')).toBeInTheDocument();
    });

    it('shows rows per page selector with options', async () => {
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(0, 20),
          meta: { total: 25, skip: 0, limit: 20, hasMore: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);
      await waitForData();

      // The page size buttons should be present (check by aria-label since numbers also appear in prices)
      const pageSizeButtons = screen.getAllByLabelText('products.pagination.rowsPerPage');
      expect(pageSizeButtons).toHaveLength(3);
    });

    it('disables prev button on first page', async () => {
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(0, 20),
          meta: { total: 25, skip: 0, limit: 20, hasMore: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);
      await waitForData();

      const prevButton = screen.getByText('products.pagination.prev');
      expect(prevButton).toBeDisabled();
    });

    it('disables next button on last page', async () => {
      const user = userEvent.setup();
      // First render with page 1 data
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(0, 20),
          meta: { total: 25, skip: 0, limit: 20, hasMore: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);
      await waitForData();

      // Navigate to page 2
      const nextButton = screen.getByText('products.pagination.next');
      await user.click(nextButton);

      // Now mock page 2 data
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(20, 25),
          meta: { total: 25, skip: 20, limit: 20, hasMore: false },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      // Wait for the refetch then check next is disabled
      await vi.waitFor(
        () => {
          expect(screen.getByText('products.pagination.next')).toBeDisabled();
        },
        { timeout: 3000, interval: 100 },
      );
    });

    it('shows pagination info text', async () => {
      mockList.mockResolvedValue({
        data: {
          data: paginatedProducts.slice(0, 20),
          meta: { total: 25, skip: 0, limit: 20, hasMore: true },
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<ProductsTable />);
      await waitForData();

      expect(screen.getByText('products.pagination.info')).toBeInTheDocument();
    });
  });
});
