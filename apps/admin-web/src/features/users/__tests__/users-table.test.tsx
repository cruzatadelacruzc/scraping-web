import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18n - return keys for predictable test matching
vi.mock('react-i18next', () => ({
  initReactI18next: { type: '3rdParty', init: () => {} },
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

// Hoisted mock variables
const { mockList, mockGetById, mockDelete, mockRolesList } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockDelete: vi.fn(),
  mockRolesList: vi.fn(),
}));

// Mock the service layer
vi.mock('../services/users-service', () => ({
  usersService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    list: (...args: unknown[]) => mockList(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getById: (...args: unknown[]) => mockGetById(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    delete: (...args: unknown[]) => mockDelete(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getRoles: (...args: unknown[]) => mockRolesList(...args),
    assignRole: vi.fn(),
    removeRole: vi.fn(),
  },
}));

import { UsersTable } from '../components/users-table';

const mockUser1 = {
  id: '1',
  email: 'user1@test.com',
  username: 'user1',
  displayName: 'User One',
  roles: [{ id: 'role-1', name: 'ACCOUNT_OWNER' }],
  emailVerified: true,
  createdAt: '2025-01-01T00:00:00.000Z',
};

const mockUser2 = {
  id: '2',
  email: 'user2@test.com',
  username: 'user2',
  displayName: 'User Two',
  roles: [{ id: 'role-2', name: 'MEMBER' }],
  emailVerified: false,
  createdAt: '2025-02-15T00:00:00.000Z',
};

const mockListResponse = {
  users: [mockUser1, mockUser2],
  total: 2,
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = createTestQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

/** Wait for the data state to resolve by looking for pagination info text. */
async function waitForData() {
  await screen.findByText(/users\.pageOf/, {}, { timeout: 2000 });
}

describe('UsersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({
      data: mockListResponse,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockGetById.mockResolvedValue({
      data: mockUser1,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockRolesList.mockResolvedValue({
      data: { roles: [], total: 0 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============ Loading ============

  it('renders loading skeleton', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockList.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<UsersTable />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ============ Error ============

  it('renders error message on fetch failure', async () => {
    mockList.mockRejectedValue(new Error('Failed to load users'));
    renderWithProviders(<UsersTable />);

    const errorMessage = await screen.findByText('Failed to load users', {}, { timeout: 2000 });
    expect(errorMessage).toBeInTheDocument();
  });

  // ============ Empty ============

  it('renders empty state when no users exist', async () => {
    mockList.mockResolvedValue({
      data: { users: [], total: 0 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    renderWithProviders(<UsersTable />);

    const emptyTitle = await screen.findByText('users.noUsers', {}, { timeout: 2000 });
    expect(emptyTitle).toBeInTheDocument();
    expect(screen.getByText('users.noUsersDesc')).toBeInTheDocument();
  });

  // ============ Data / Happy path ============

  it('renders user rows with correct data', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    // Data values are rendered directly (not through t())
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
    expect(screen.getByText('user1@test.com')).toBeInTheDocument();
    expect(screen.getByText('user2@test.com')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT_OWNER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
  });

  // ============ Search ============

  it('renders search input with correct placeholder', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    const searchInput = screen.getByPlaceholderText('users.searchPlaceholder');
    expect(searchInput).toBeInTheDocument();
  });

  it('searches when user types', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    const searchInput = screen.getByPlaceholderText('users.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'acme' } });

    expect(searchInput).toHaveValue('acme');
  });

  // ============ Drawer ============

  it('opens user detail drawer on row click', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    // Click on user row (data value - not i18n)
    fireEvent.click(screen.getByText('User One'));

    // Drawer heading uses t('users.detailTitle') → renders as 'users.detailTitle'
    await waitFor(() => {
      expect(screen.getByText('users.detailTitle')).toBeInTheDocument();
    });
  });

  it('shows loading skeleton in drawer while fetching user', async () => {
    // Make getById hang to simulate loading
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockGetById.mockReturnValue(new Promise(() => {}));

    renderWithProviders(<UsersTable />);
    await waitForData();

    fireEvent.click(screen.getByText('User One'));

    // Drawer skeleton
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state in drawer when fetch fails', async () => {
    mockGetById.mockRejectedValue(new Error('Fetch error'));

    renderWithProviders(<UsersTable />);
    await waitForData();

    fireEvent.click(screen.getByText('User One'));

    await waitFor(() => {
      expect(screen.getByText('users.detailError')).toBeInTheDocument();
    });
  });

  it('closes drawer when close button is clicked', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    // Open drawer
    fireEvent.click(screen.getByText('User One'));
    expect(screen.getByText('users.detailTitle')).toBeInTheDocument();

    // Close it
    fireEvent.click(screen.getByLabelText('users.drawerClose'));

    // After closing, the backdrop (only rendered when isOpen=true) should be removed
    await waitFor(() => {
      expect(document.querySelector('.z-40')).toBeNull();
    });
  });

  // ============ Delete ============

  it('shows delete confirmation dialog when delete is clicked', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    // Open drawer
    fireEvent.click(screen.getByText('User One'));
    await waitFor(() => {
      expect(screen.getByText('users.detailTitle')).toBeInTheDocument();
    });

    // Wait for drawer data to load (user detail content appears)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /users\.deleteUser/ })).toBeInTheDocument();
    });

    // Click delete user button
    fireEvent.click(screen.getByRole('button', { name: /users\.deleteUser/ }));

    // Confirmation dialog description
    expect(screen.getByText(/users\.deleteDescription/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /users\.permanentlyDelete/ })).toBeInTheDocument();
  });

  it('deletes user on confirmation', async () => {
    mockDelete.mockResolvedValue({
      data: undefined,
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: {},
    });

    renderWithProviders(<UsersTable />);
    await waitForData();

    // Open drawer
    fireEvent.click(screen.getByText('User One'));
    await waitFor(() => {
      expect(screen.getByText('users.detailTitle')).toBeInTheDocument();
    });

    // Wait for drawer data to load
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /users\.deleteUser/ })).toBeInTheDocument();
    });

    // Click delete user button
    fireEvent.click(screen.getByRole('button', { name: /users\.deleteUser/ }));

    // Confirm deletion
    const confirmBtn = screen.getByRole('button', { name: /users\.permanentlyDelete/ });
    fireEvent.click(confirmBtn);

    // Wait for mutation to complete
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1');
    });
  });
});
