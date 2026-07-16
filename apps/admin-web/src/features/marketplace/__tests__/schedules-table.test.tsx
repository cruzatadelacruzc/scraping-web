import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Hoisted mock variables ─────────────────────────────────────────────────

const { mockUseGetSchedules } = vi.hoisted(() => ({
  mockUseGetSchedules: vi.fn(),
}));

const { mockUseDeleteSchedule } = vi.hoisted(() => ({
  mockUseDeleteSchedule: vi.fn(),
}));

const { mockUseToggleSchedule } = vi.hoisted(() => ({
  mockUseToggleSchedule: vi.fn(),
}));

// ── Mocks ──────────────────────────────────────────────────────────────────

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

vi.mock('../hooks/useGetSchedules', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetSchedules: (...args: unknown[]) => mockUseGetSchedules(...args),
}));

vi.mock('../hooks/useDeleteSchedule', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useDeleteSchedule: (...args: unknown[]) => mockUseDeleteSchedule(...args),
}));

vi.mock('../hooks/useToggleSchedule', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useToggleSchedule: (...args: unknown[]) => mockUseToggleSchedule(...args),
}));

// Sonner toast mock
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Component under test ───────────────────────────────────────────────────

import { SchedulesTable } from '../components/schedules/schedules-table';

// ── Test data ──────────────────────────────────────────────────────────────

const mockSchedules = [
  {
    id: 'sched-1',
    name: 'Daily Revolico',
    store: 'revolico',
    cron: '0 0 * * *',
    enabled: true,
    jobs: [{ category: 'url1' }],
    lastRunAt: new Date('2024-06-01T12:00:00.000Z'),
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-06-01T12:00:00.000Z'),
    jobsCount: 1,
  },
  {
    id: 'sched-2',
    name: 'Weekly Facebook',
    store: 'facebook-marketplace',
    cron: '0 0 * * 0',
    enabled: false,
    jobs: [{ searchQuery: 'cars' }, { searchQuery: 'phones' }],
    lastRunAt: null,
    createdAt: new Date('2024-02-01T00:00:00.000Z'),
    updatedAt: new Date('2024-05-01T00:00:00.000Z'),
    jobsCount: 2,
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SchedulesTable', () => {
  const mockDeleteMutate = vi.fn();
  const mockToggleMutate = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading skeleton while fetching schedules', () => {
      mockUseGetSchedules.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });

      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);
      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error message with retry button when fetch fails', () => {
      const refetch = vi.fn();
      mockUseGetSchedules.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch,
        isFetching: false,
      });

      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);
      expect(screen.getByText('Network error')).toBeInTheDocument();
      expect(screen.getByText('common.retry')).toBeInTheDocument();
    });

    it('calls refetch when retry button is clicked', async () => {
      const refetch = vi.fn();
      mockUseGetSchedules.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Network error'),
        refetch,
        isFetching: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);
      await user.click(screen.getByText('common.retry'));
      expect(refetch).toHaveBeenCalledTimes(1);
    });

    it('shows translated error message when no Error instance', () => {
      mockUseGetSchedules.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });

      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);
      expect(screen.getByText('scrapers.schedules.error.message')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state with icon and message when no schedules exist', () => {
      mockUseGetSchedules.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });

      const { container } = renderWithProviders(
        <SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />,
      );
      expect(screen.getByText('scrapers.schedules.empty.title')).toBeInTheDocument();
      expect(screen.getByText('scrapers.schedules.empty.description')).toBeInTheDocument();

      // Must render an SVG icon with aria-hidden="true"
      const icon = container.querySelector('svg[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });

    it('shows create button in empty state that calls onCreate', async () => {
      const onCreate = vi.fn();
      mockUseGetSchedules.mockReturnValue({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });

      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={onCreate} />);
      const createButton = screen.getByText('scrapers.schedules.empty.create');
      await user.click(createButton);
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('data render', () => {
    beforeEach(() => {
      mockUseGetSchedules.mockReturnValue({
        data: mockSchedules,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });
      mockUseDeleteSchedule.mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
      });
      mockUseToggleSchedule.mockReturnValue({
        mutate: mockToggleMutate,
        isPending: false,
      });
    });

    it('renders table with schedule names', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      expect(screen.getByText('Daily Revolico')).toBeInTheDocument();
      expect(screen.getByText('Weekly Facebook')).toBeInTheDocument();
    });

    it('renders store keys in table', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      expect(screen.getByText('revolico')).toBeInTheDocument();
      expect(screen.getByText('facebook-marketplace')).toBeInTheDocument();
    });

    it('renders cron expressions in font-mono', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const cronEl1 = screen.getByText('0 0 * * *');
      expect(cronEl1).toBeInTheDocument();
      expect(cronEl1.className).toContain('font-mono');
    });

    it('renders enabled toggle switches', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const toggles = screen.getAllByRole('switch');
      expect(toggles).toHaveLength(2);
    });

    it('toggle reflects enabled state', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const toggles = screen.getAllByRole('switch');
      expect(toggles[0]).toHaveAttribute('aria-checked', 'true');
      expect(toggles[1]).toHaveAttribute('aria-checked', 'false');
    });

    it('renders lastRunAt formatted date for schedules with runs', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      // Should show a formatted date (not "Never")
      expect(screen.queryByText('Never')).not.toBeInTheDocument();
      // The exact format depends on date-fns, check that a date-like string appears
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('renders "Never" for schedules that never ran', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      expect(screen.getByText('scrapers.schedules.table.never')).toBeInTheDocument();
    });

    it('renders jobs count', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const jobsCounts = screen.getAllByText(/^[12]$/);
      expect(jobsCounts).toHaveLength(2);
    });

    it('has a visually hidden caption', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const caption = screen.getByText('scrapers.schedules.table.caption');
      expect(caption).toBeInTheDocument();
      expect(caption.className).toContain('sr-only');
    });

    it('renders header with schedule count', () => {
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      // The i18n mock returns the key; the count template is in the JSON value
      expect(screen.getByText('scrapers.schedules.table.count')).toBeInTheDocument();
    });

    it('renders create button that calls onCreate', async () => {
      const onCreate = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={onCreate} />);

      await user.click(screen.getByText('scrapers.schedules.table.create'));
      expect(onCreate).toHaveBeenCalledTimes(1);
    });
  });

  describe('row actions', () => {
    beforeEach(() => {
      mockUseGetSchedules.mockReturnValue({
        data: mockSchedules,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });
      mockUseDeleteSchedule.mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
      });
      mockUseToggleSchedule.mockReturnValue({
        mutate: mockToggleMutate,
        isPending: false,
      });
    });

    it('renders dropdown menu with edit and delete options', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      // Click the first row's action trigger
      const actionButtons = screen.getAllByRole('button', {
        name: /scrapers\.schedules\.table\.actionsFor/,
      });
      await user.click(actionButtons[0]);

      expect(screen.getByText('scrapers.schedules.table.edit')).toBeInTheDocument();
      expect(screen.getByText('scrapers.schedules.table.delete')).toBeInTheDocument();
    });

    it('calls onEdit when edit is clicked', async () => {
      const onEdit = vi.fn();
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={onEdit} onCreate={vi.fn()} />);

      const actionButtons = screen.getAllByRole('button', {
        name: /scrapers\.schedules\.table\.actionsFor/,
      });
      await user.click(actionButtons[0]);

      await user.click(screen.getByText('scrapers.schedules.table.edit'));
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(mockSchedules[0]);
    });

    it('opens AlertDialog when delete is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const actionButtons = screen.getAllByRole('button', {
        name: /scrapers\.schedules\.table\.actionsFor/,
      });
      await user.click(actionButtons[0]);

      await user.click(screen.getByText('scrapers.schedules.table.delete'));

      // AlertDialog should appear
      expect(screen.getByText('scrapers.schedules.delete.title')).toBeInTheDocument();
      expect(screen.getByText('scrapers.schedules.delete.description')).toBeInTheDocument();
      expect(screen.getByText('scrapers.schedules.delete.confirm')).toBeInTheDocument();
      expect(screen.getByText('scrapers.schedules.delete.cancel')).toBeInTheDocument();
    });

    it('deletes schedule when confirm is clicked in AlertDialog', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const actionButtons = screen.getAllByRole('button', {
        name: /scrapers\.schedules\.table\.actionsFor/,
      });
      await user.click(actionButtons[0]);
      await user.click(screen.getByText('scrapers.schedules.table.delete'));

      // Click confirm
      await user.click(screen.getByText('scrapers.schedules.delete.confirm'));
      expect(mockDeleteMutate).toHaveBeenCalledWith('sched-1');
    });

    it('closes AlertDialog without deleting when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const actionButtons = screen.getAllByRole('button', {
        name: /scrapers\.schedules\.table\.actionsFor/,
      });
      await user.click(actionButtons[0]);
      await user.click(screen.getByText('scrapers.schedules.table.delete'));

      // Click cancel
      await user.click(screen.getByText('scrapers.schedules.delete.cancel'));
      expect(mockDeleteMutate).not.toHaveBeenCalled();
    });
  });

  describe('toggle', () => {
    beforeEach(() => {
      mockUseGetSchedules.mockReturnValue({
        data: mockSchedules,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
        isFetching: false,
      });
      mockUseDeleteSchedule.mockReturnValue({
        mutate: mockDeleteMutate,
        isPending: false,
      });
      mockUseToggleSchedule.mockReturnValue({
        mutate: mockToggleMutate,
        isPending: false,
      });
    });

    it('calls toggle mutation when toggle switch is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<SchedulesTable onEdit={vi.fn()} onCreate={vi.fn()} />);

      const toggles = screen.getAllByRole('switch');
      await user.click(toggles[0]);

      expect(mockToggleMutate).toHaveBeenCalledWith('sched-1');
    });
  });
});
