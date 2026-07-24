import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

const mockUseGetPlans = vi.fn();
const mockUseDeletePlan = vi.fn();

vi.mock('../hooks/useGetPlans', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetPlans: (...args: unknown[]) => mockUseGetPlans(...args),
}));

vi.mock('../hooks/useDeletePlan', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useDeletePlan: (...args: unknown[]) => mockUseDeletePlan(...args),
}));

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

import { PlansTable } from '../components/plans-table';
import type { PlanListViewModel } from '../view-models/plan-view-model';

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const mockPlans: PlanListViewModel[] = [
  {
    id: '1',
    name: 'Trial',
    description: 'Free trial plan',
    price: 0,
    features: {
      maxAlarms: 3,
      allowedConditions: ['PRICE_DROPS', 'PRICE_RISES'],
      aiAlarms: false,
      notificationChannels: ['in-app'],
    },
    subscriberCount: 10,
    isDefault: true,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    maxAlarmsLabel: '3',
    channelBadges: [{ label: 'In-app', variant: 'default' }],
    conditionCount: 2,
  },
  {
    id: '2',
    name: 'Standard',
    description: 'Standard plan',
    price: 9.99,
    features: {
      maxAlarms: 20,
      allowedConditions: [
        'PRICE_DROPS',
        'PRICE_RISES',
        'PRICE_CHANGE_PERCENT',
        'VIEW_COUNT_THRESHOLD',
        'SELLER_CHANGE',
        'OUTSTANDING_STATUS',
      ],
      aiAlarms: false,
      notificationChannels: ['in-app', 'email'],
    },
    subscriberCount: 25,
    isDefault: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    maxAlarmsLabel: '20',
    channelBadges: [
      { label: 'In-app', variant: 'default' },
      { label: 'Email', variant: 'default' },
    ],
    conditionCount: 6,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PlansTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: loading state
    mockUseGetPlans.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    });

    mockUseDeletePlan.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      variables: undefined,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeleton initially', () => {
      renderWithProviders(<PlansTable />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      const refetch = vi.fn();
      mockUseGetPlans.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        isFetching: false,
        refetch,
      });

      renderWithProviders(<PlansTable />);

      const errorMessage = screen.getByText('Network error');
      expect(errorMessage).toBeInTheDocument();

      const retryButton = screen.getByText('common.retry');
      await userEvent.click(retryButton);
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('shows translated fallback error when not an Error instance', () => {
      mockUseGetPlans.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: 'Something went wrong',
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);
      expect(screen.getByText('common.error')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state with title, description, and CTA when no plans exist', () => {
      mockUseGetPlans.mockReturnValue({
        data: { items: [], total: 0 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);

      expect(screen.getByText('plans.empty.title')).toBeInTheDocument();
      expect(screen.getByText('plans.empty.description')).toBeInTheDocument();
      expect(screen.getByText('plans.create.button')).toBeInTheDocument();
    });
  });

  describe('data state', () => {
    beforeEach(() => {
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });
    });

    it('renders plan rows in the table', () => {
      renderWithProviders(<PlansTable />);

      // Plan names
      expect(screen.getByText('Trial')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();

      // Prices
      expect(screen.getByText('$0.00')).toBeInTheDocument();
      expect(screen.getByText('$9.99')).toBeInTheDocument();
    });

    it('renders search input with correct placeholder', () => {
      renderWithProviders(<PlansTable />);
      expect(screen.getByPlaceholderText('plans.searchPlaceholder')).toBeInTheDocument();
    });

    it('renders pagination info and controls', () => {
      renderWithProviders(<PlansTable />);
      expect(screen.getByText('plans.pagination.info')).toBeInTheDocument();
      expect(screen.getByText('common.prev')).toBeInTheDocument();
      expect(screen.getByText('common.next')).toBeInTheDocument();
    });

    it('renders table column headers', () => {
      renderWithProviders(<PlansTable />);
      expect(screen.getByText('plans.table.name')).toBeInTheDocument();
      expect(screen.getByText('plans.table.price')).toBeInTheDocument();
      expect(screen.getByText('plans.table.maxAlarms')).toBeInTheDocument();
      expect(screen.getByText('plans.table.conditions')).toBeInTheDocument();
      expect(screen.getByText('plans.table.channels')).toBeInTheDocument();
      expect(screen.getByText('plans.table.ai')).toBeInTheDocument();
      expect(screen.getByText('plans.table.subscribers')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('debounces search input and triggers refetch with search term', async () => {
      const user = userEvent.setup();
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);
      mockUseGetPlans.mockClear();

      const searchInput = screen.getByPlaceholderText('plans.searchPlaceholder');
      await user.type(searchInput, 'Trial');

      await vi.waitFor(
        () => {
          expect(mockUseGetPlans).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'Trial' }),
          );
        },
        { timeout: 1000, interval: 50 },
      );
    });

    it('resets to page 1 when search changes', async () => {
      const user = userEvent.setup();
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);
      mockUseGetPlans.mockClear();

      const searchInput = screen.getByPlaceholderText('plans.searchPlaceholder');
      await user.type(searchInput, 'abc');

      await vi.waitFor(
        () => {
          const calls = mockUseGetPlans.mock.calls;
          const lastCall = calls[calls.length - 1] as [{ page: number }];
          expect(lastCall[0].page).toBe(1);
        },
        { timeout: 1000, interval: 50 },
      );
    });
  });

  describe('delete flow', () => {
    it('opens AlertDialog when delete action is triggered from dropdown', async () => {
      const user = userEvent.setup();
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);

      // Open dropdown menu for the "Trial" row
      const actionsButton = screen.getByLabelText('plans.table.actions — Trial');
      await user.click(actionsButton);

      // Click the delete menu item
      await user.click(screen.getByText('plans.delete.title'));

      // AlertDialog should be visible
      expect(screen.getByText('plans.delete.title')).toBeInTheDocument();
      expect(screen.getByText('plans.delete.description')).toBeInTheDocument();
      expect(screen.getByText('plans.delete.confirm')).toBeInTheDocument();
      expect(screen.getByText('common.close')).toBeInTheDocument();
    });

    it('calls delete mutation when confirmed', async () => {
      const user = userEvent.setup();
      const deleteMutate = vi.fn();
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });
      mockUseDeletePlan.mockReturnValue({
        mutate: deleteMutate,
        isPending: false,
        variables: undefined,
      });

      renderWithProviders(<PlansTable />);

      // Open dropdown and click delete
      await user.click(screen.getByLabelText('plans.table.actions — Trial'));
      await user.click(screen.getByText('plans.delete.title'));

      // Click confirm
      await user.click(screen.getByText('plans.delete.confirm'));

      // Verify mutate was called with the correct plan id
      expect(deleteMutate).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({
          onSettled: expect.any(Function),
        }),
      );
    });

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      mockUseGetPlans.mockReturnValue({
        data: { items: mockPlans, total: mockPlans.length },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
        refetch: vi.fn(),
      });

      renderWithProviders(<PlansTable />);

      // Open dropdown and click delete
      await user.click(screen.getByLabelText('plans.table.actions — Trial'));
      await user.click(screen.getByText('plans.delete.title'));

      // Dialog should be open
      expect(screen.getByText('plans.delete.title')).toBeInTheDocument();

      // Click cancel
      await user.click(screen.getByText('common.close'));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByText('plans.delete.title')).not.toBeInTheDocument();
      });
    });
  });
});
