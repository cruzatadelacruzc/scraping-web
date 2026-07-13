import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Hoisted mock variables — must be defined before vi.mock (which is hoisted)
const { mockList, mockDelete, mockGetById } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockDelete: vi.fn(),
  mockGetById: vi.fn(),
}));

// Mock i18n
vi.mock('react-i18next', () => ({
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

// Mock the accounts service
vi.mock('../services/accounts-service', () => ({
  accountsService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    list: (...args: unknown[]) => mockList(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    delete: (...args: unknown[]) => mockDelete(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getById: (...args: unknown[]) => mockGetById(...args),
  },
}));

import { AccountsTable } from '../components/accounts-table';

const mockAccounts = [
  {
    id: '1',
    name: 'Acme Corp',
    userCount: 5,
    subscriptionCount: 2,
    alarmCount: 3,
    createdAt: '2024-01-15T00:00:00.000Z',
  },
  {
    id: '2',
    name: 'Globex Inc',
    userCount: 12,
    subscriptionCount: 4,
    alarmCount: 7,
    createdAt: '2024-03-20T00:00:00.000Z',
  },
];

const mockListResponse = {
  accounts: mockAccounts,
  total: 2,
  skip: 0,
  limit: 20,
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
  await screen.findByText('accounts.pagination.info', {}, { timeout: 2000 });
}

describe('AccountsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: mockListResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockDelete.mockResolvedValue({
      data: undefined,
      status: 204,
      statusText: 'No Content',
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
      renderWithProviders(<AccountsTable />);

      const skeletons = document.querySelectorAll('.animate-pulse');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('error state', () => {
    it('shows error message when fetch fails', async () => {
      mockList.mockRejectedValue(new Error('Network error'));
      renderWithProviders(<AccountsTable />);

      const errorMessage = await screen.findByText('Network error', {}, { timeout: 2000 });
      expect(errorMessage).toBeInTheDocument();
    });

    it('shows translated error when no Error instance', async () => {
      mockList.mockRejectedValue('Something went wrong');
      renderWithProviders(<AccountsTable />);

      const errorMessage = await screen.findByText('accounts.error.message', {}, { timeout: 2000 });
      expect(errorMessage).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows empty state when no accounts exist', async () => {
      mockList.mockResolvedValue({
        data: { accounts: [], total: 0, skip: 0, limit: 20 },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
      renderWithProviders(<AccountsTable />);

      const emptyTitle = await screen.findByText('accounts.empty.title', {}, { timeout: 2000 });
      expect(emptyTitle).toBeInTheDocument();
      expect(screen.getByText('accounts.empty.description')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('renders a search input with the correct placeholder', async () => {
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const searchInput = screen.getByPlaceholderText('accounts.searchPlaceholder');
      expect(searchInput).toBeInTheDocument();
    });

    it('debounces search input before triggering query', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      mockList.mockClear();

      const searchInput = screen.getByPlaceholderText('accounts.searchPlaceholder');
      await user.type(searchInput, 'acme');

      // API should not have been called immediately (within debounce window)
      // The debounce fires after 300ms, so we wait enough for it to fire
      await vi.waitFor(
        () => {
          expect(mockList).toHaveBeenCalledWith(
            expect.objectContaining({ search: 'acme', skip: 0, limit: 20 }),
          );
        },
        { timeout: 1000, interval: 50 },
      );
    });

    it('resets to page 1 when search changes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      mockList.mockClear();

      const searchInput = screen.getByPlaceholderText('accounts.searchPlaceholder');
      await user.type(searchInput, 'acme');

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

  describe('delete flow', () => {
    it('opens an AlertDialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      // Find delete buttons (one per row)
      const deleteButtons = screen.getAllByLabelText('accounts.delete.title');
      expect(deleteButtons.length).toBe(2);

      await user.click(deleteButtons[0]);

      // AlertDialog should be visible
      expect(screen.getByText('accounts.delete.title')).toBeInTheDocument();
      expect(screen.getByText('accounts.delete.description')).toBeInTheDocument();
      expect(screen.getByText('accounts.delete.confirm')).toBeInTheDocument();
      expect(screen.getByText('accounts.delete.cancel')).toBeInTheDocument();
    });

    it('calls delete API when confirmed', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      // Click delete button for first row
      const deleteButtons = screen.getAllByLabelText('accounts.delete.title');
      await user.click(deleteButtons[0]);

      // Click confirm
      const confirmButton = screen.getByText('accounts.delete.confirm');
      await user.click(confirmButton);

      // Wait for the mutation to resolve
      await vi.waitFor(() => {
        expect(mockDelete).toHaveBeenCalledWith('1');
      });
    });

    it('closes the dialog when cancel is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const deleteButtons = screen.getAllByLabelText('accounts.delete.title');
      await user.click(deleteButtons[0]);

      // Dialog should be open
      expect(screen.getByText('accounts.delete.title')).toBeInTheDocument();

      // Click cancel
      await user.click(screen.getByText('accounts.delete.cancel'));

      // Dialog should close
      expect(screen.queryByText('accounts.delete.title')).not.toBeInTheDocument();
    });
  });

  describe('bulk selection', () => {
    it('renders master checkbox in the header', async () => {
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const masterCheckbox = screen.getByLabelText('Select all accounts');
      expect(masterCheckbox).toBeInTheDocument();
    });

    it('renders a checkbox for each row', async () => {
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const rowCheckboxes = screen.getAllByRole('checkbox');
      // master + 2 rows = 3
      expect(rowCheckboxes.length).toBe(3);
    });

    it('selects all rows when master checkbox is clicked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const masterCheckbox = screen.getByLabelText('Select all accounts');
      await user.click(masterCheckbox);

      // All row checkboxes should be checked
      const rowCheckboxes = screen.getAllByRole('checkbox');
      rowCheckboxes.forEach((cb) => {
        expect((cb as HTMLInputElement).checked).toBe(true);
      });
    });

    it('shows bulk action bar when rows are selected', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      // Action bar should not be visible initially
      expect(screen.queryByText('accounts.selected.count')).not.toBeInTheDocument();

      // Select one row (index 1 = first data row, after master)
      const rowCheckboxes = screen.getAllByRole('checkbox');
      await user.click(rowCheckboxes[1]);

      // Action bar should appear
      expect(screen.getByText('accounts.selected.count')).toBeInTheDocument();
    });

    it('shows correct selected count', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      // Select first row
      const rowCheckboxes = screen.getAllByRole('checkbox');
      await user.click(rowCheckboxes[1]);

      expect(screen.getByText('accounts.selected.count')).toBeInTheDocument();

      // Also select second row
      await user.click(rowCheckboxes[2]);

      expect(screen.getByText('accounts.selected.count')).toBeInTheDocument();
    });

    it('deselects all when master checkbox is unchecked', async () => {
      const user = userEvent.setup();
      renderWithProviders(<AccountsTable />);
      await waitForData();

      const masterCheckbox = screen.getByLabelText('Select all accounts');

      // Select all
      await user.click(masterCheckbox);
      expect(screen.getByText('accounts.selected.count')).toBeInTheDocument();

      // Deselect all
      await user.click(masterCheckbox);

      // Action bar should disappear
      expect(screen.queryByText('accounts.selected.count')).not.toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('renders pagination info', async () => {
      renderWithProviders(<AccountsTable />);
      await waitForData();

      expect(screen.getByText('accounts.pagination.info')).toBeInTheDocument();
    });

    it('renders prev and next buttons', async () => {
      renderWithProviders(<AccountsTable />);
      await waitForData();

      expect(screen.getByText('accounts.pagination.prev')).toBeInTheDocument();
      expect(screen.getByText('accounts.pagination.next')).toBeInTheDocument();
    });
  });
});
