import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
}));

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
    i18n: { language: 'en' },
  }),
}));

const mockUseGetStores = vi.fn();

vi.mock('../hooks/useGetStores', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetStores: (...args: unknown[]) => mockUseGetStores(...args),
}));

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

import { StoresList } from '../components/stores/stores-list';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockStores = [
  {
    key: 'revolico',
    displayName: 'Revolico',
    scrapingQueue: 'revolico-scraping',
    jobSchema: {
      fields: [
        {
          name: 'category',
          type: 'string' as const,
          required: true,
          label: 'Category URL',
          placeholder: 'https://revolico.com/category/...',
        },
        {
          name: 'maxPages',
          type: 'number' as const,
          required: false,
          label: 'Max Pages',
          placeholder: '5',
        },
        { name: 'scrapeImages', type: 'boolean' as const, required: false, label: 'Scrape Images' },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoresList', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: loading state
    mockUseGetStores.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  // ---- Loading ----

  it('shows loading skeleton while fetching stores', () => {
    renderWithProviders(<StoresList />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ---- Error ----

  it('shows error message with retry button when fetch fails', () => {
    const refetch = vi.fn();
    mockUseGetStores.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    });

    renderWithProviders(<StoresList />);
    expect(screen.getByText('scrapers.stores.error.message')).toBeInTheDocument();
    expect(screen.getByText('common.retry')).toBeInTheDocument();
  });

  it('calls refetch when retry button is clicked', async () => {
    const refetch = vi.fn();
    mockUseGetStores.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    });

    const user = userEvent.setup();
    renderWithProviders(<StoresList />);
    await user.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  // ---- Empty ----

  it('shows empty state with icon and message when no stores are registered', () => {
    mockUseGetStores.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderWithProviders(<StoresList />);
    expect(screen.getByText('scrapers.stores.empty.title')).toBeInTheDocument();
    expect(screen.getByText('scrapers.stores.empty.description')).toBeInTheDocument();

    // Must render a lucide icon with aria-hidden="true" (admin-web-ui.md §4.2)
    const icon = container.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  // ---- Data render ----

  it('renders store cards with displayName and store key badge', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    // Card heading
    expect(screen.getByText('Revolico')).toBeInTheDocument();
    // Store key badge
    expect(screen.getByText('revolico')).toBeInTheDocument();
  });

  it('renders the scraping queue name in font-mono', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    const queueEl = screen.getByText('revolico-scraping');
    expect(queueEl).toBeInTheDocument();
    expect(queueEl.className).toContain('font-mono');
  });

  it('renders a section heading for job schema fields', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);
    expect(screen.getByText('scrapers.stores.card.schemaFields')).toBeInTheDocument();
  });

  it('renders field label and name for each schema field', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    // Field labels
    expect(screen.getByText('Category URL')).toBeInTheDocument();
    expect(screen.getByText('Max Pages')).toBeInTheDocument();
    expect(screen.getByText('Scrape Images')).toBeInTheDocument();

    // Field names (rendered inside parentheses)
    expect(screen.getByText(/^\(category\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^\(maxPages\)$/)).toBeInTheDocument();
    expect(screen.getByText(/^\(scrapeImages\)$/)).toBeInTheDocument();
  });

  it('renders type chip for each field type', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    expect(screen.getByText('string')).toBeInTheDocument();
    expect(screen.getByText('number')).toBeInTheDocument();
    expect(screen.getByText('boolean')).toBeInTheDocument();
  });

  it('marks required fields with a required indicator', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    // category is required
    expect(screen.getByText('scrapers.stores.card.required')).toBeInTheDocument();
  });

  it('renders multiple store cards when multiple stores exist', () => {
    const multipleStores = [
      ...mockStores,
      {
        key: 'facebook-marketplace',
        displayName: 'Facebook Marketplace',
        scrapingQueue: 'fb-marketplace-scraping',
        jobSchema: {
          fields: [
            {
              name: 'searchQuery',
              type: 'string' as const,
              required: true,
              label: 'Search Query',
              placeholder: '...',
            },
          ],
        },
      },
    ];

    mockUseGetStores.mockReturnValue({
      data: multipleStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);

    expect(screen.getByText('Revolico')).toBeInTheDocument();
    expect(screen.getByText('Facebook Marketplace')).toBeInTheDocument();
    expect(screen.getByText('fb-marketplace-scraping')).toBeInTheDocument();
  });

  it('does not display a search input (stores are few, rendered as cards)', () => {
    mockUseGetStores.mockReturnValue({
      data: mockStores,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<StoresList />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
