import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Hoisted mock variables
const { mockListByAccount, mockAssign, mockCancel } = vi.hoisted(() => ({
  mockListByAccount: vi.fn(),
  mockAssign: vi.fn(),
  mockCancel: vi.fn(),
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

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock i18n for toast calls
vi.mock('@shared/i18n/i18n', () => ({
  default: {
    t: (key: string) => key,
  },
}));

// Mock subscription service
vi.mock('../services/account-subscriptions-service', () => ({
  accountSubscriptionsService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    listByAccount: (...args: unknown[]) => mockListByAccount(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    assign: (...args: unknown[]) => mockAssign(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    cancel: (...args: unknown[]) => mockCancel(...args),
  },
}));

// Mock plans service (used by plan-selector-dialog)
const { mockPlansList } = vi.hoisted(() => ({
  mockPlansList: vi.fn(),
}));

vi.mock('../../plans/services/plans-service', () => ({
  plansService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    list: (...args: unknown[]) => mockPlansList(...args),
  },
}));

import { SubscriptionSection } from '../components/subscription-section';

const activeSubscription = {
  id: 'sub-1',
  planId: 'plan-1',
  planName: 'Standard Plan',
  accountId: 'acc-1',
  status: 'ACTIVE' as const,
  periodStart: '2026-01-01T00:00:00.000Z',
  periodEnd: '2026-12-31T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
}

interface RenderOptions {
  accountId?: string;
  queryClient?: QueryClient;
}

function renderWithProviders(ui: React.ReactElement, options?: RenderOptions) {
  const qc = options?.queryClient ?? createTestQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('SubscriptionSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListByAccount.mockResolvedValue({
      data: { subscriptions: [activeSubscription] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('active subscription', () => {
    it('renders plan name and status', async () => {
      renderWithProviders(<SubscriptionSection accountId="acc-1" />);

      const planName = await screen.findByText('Standard Plan', {}, { timeout: 2000 });
      expect(planName).toBeInTheDocument();

      const statusBadge = await screen.findByText('ACTIVE', {}, { timeout: 2000 });
      expect(statusBadge).toBeInTheDocument();
    });

    it('renders remaining days', async () => {
      renderWithProviders(<SubscriptionSection accountId="acc-1" />);

      const daysLeft = await screen.findByText(
        'accounts.subscription.daysLeft',
        {},
        { timeout: 2000 },
      );
      expect(daysLeft).toBeInTheDocument();
    });

    it('shows Change Plan and Cancel buttons', async () => {
      renderWithProviders(<SubscriptionSection accountId="acc-1" />);

      const changeBtn = await screen.findByText(
        'accounts.subscription.changePlan',
        {},
        { timeout: 2000 },
      );
      expect(changeBtn).toBeInTheDocument();

      const cancelBtn = await screen.findByText(
        'accounts.subscription.cancel.label',
        {},
        { timeout: 2000 },
      );
      expect(cancelBtn).toBeInTheDocument();
    });
  });

  describe('no active subscription', () => {
    it('renders empty state with Assign Plan button', async () => {
      mockListByAccount.mockResolvedValue({
        data: { subscriptions: [] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });

      renderWithProviders(<SubscriptionSection accountId="acc-1" />);

      const emptyText = await screen.findByText(
        'accounts.subscription.noActiveSubscription',
        {},
        { timeout: 2000 },
      );
      expect(emptyText).toBeInTheDocument();

      const assignBtn = await screen.findByText(
        'accounts.subscription.assignPlan',
        {},
        { timeout: 2000 },
      );
      expect(assignBtn).toBeInTheDocument();
    });
  });

  describe('cancel subscription', () => {
    it('opens AlertDialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SubscriptionSection accountId="acc-1" />);

      const cancelBtn = await screen.findByText(
        'accounts.subscription.cancel.label',
        {},
        { timeout: 2000 },
      );
      await user.click(cancelBtn);

      expect(screen.getByText('accounts.subscription.cancel.title')).toBeInTheDocument();
      expect(screen.getByText('accounts.subscription.cancel.description')).toBeInTheDocument();
      expect(screen.getByText('accounts.subscription.cancel.confirm')).toBeInTheDocument();
    });
  });
});
