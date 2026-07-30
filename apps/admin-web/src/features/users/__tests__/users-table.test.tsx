import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock i18n - return keys for predictable test matching
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

// Hoisted mock variables
const { mockList, mockGetById, mockDelete, mockRolesList, mockRemoveRole } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockGetById: vi.fn(),
  mockDelete: vi.fn(),
  mockRolesList: vi.fn(),
  mockRemoveRole: vi.fn(),
}));

// Mock the service layer
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
  RoleType: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ACCOUNT_OWNER: 'ACCOUNT_OWNER',
    MEMBER: 'MEMBER',
  },
}));

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
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    removeRole: (...args: unknown[]) => mockRemoveRole(...args),
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
    fireEvent.click(screen.getByLabelText('common.close'));

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

  it('offers only active unassigned roles in the assign dropdown', async () => {
    mockRolesList.mockResolvedValue({
      data: {
        roles: [
          { id: 'role-2', name: 'MEMBER', accountId: null, deletedAt: null, userCount: 1 },
          {
            id: 'role-3',
            name: 'AUDITOR',
            accountId: null,
            deletedAt: '2026-07-01T00:00:00.000Z',
            userCount: 0,
          },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    renderWithProviders(<UsersTable />);
    await waitForData();

    fireEvent.click(screen.getByText('User One'));
    await waitFor(() => {
      expect(screen.getByText('users.detailTitle')).toBeInTheDocument();
    });

    // Wait for drawer data to load and role select to become available
    const select = await screen.findByLabelText('users.selectRole', {}, { timeout: 2000 });
    const optionTexts = Array.from(select.querySelectorAll('option')).map((o) => o.textContent);
    expect(optionTexts).toContain('MEMBER');
    expect(optionTexts).not.toContain('AUDITOR');
  });

  // ============ Manage Roles ============

  it('shows the manage-roles button and opens the dialog', async () => {
    renderWithProviders(<UsersTable />);
    await waitForData();

    fireEvent.click(screen.getByText('roles.manageButton'));
    expect(await screen.findByText('roles.dialogTitle')).toBeInTheDocument();
  });

  // ============ Role removal ============

  it('asks for confirmation before removing a role and mutates on confirm', async () => {
    mockRolesList.mockResolvedValue({
      data: {
        roles: [
          { id: 'role-1', name: 'ACCOUNT_OWNER', accountId: null, deletedAt: null, userCount: 1 },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockRemoveRole.mockResolvedValue({
      data: {},
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    renderWithProviders(<UsersTable />);
    await waitForData();

    fireEvent.click(screen.getByText('User One'));
    await screen.findByText('users.detailTitle');

    // findByLabelText (not getByLabelText): the drawer title renders unconditionally
    // (visibility is CSS/aria-hidden driven, not conditional mount), so it resolves
    // before the user/roles queries settle — the remove button needs a poll, not a
    // synchronous lookup, to wait for `data` to arrive.
    fireEvent.click(await screen.findByLabelText('users.removeRole'));
    expect(mockRemoveRole).not.toHaveBeenCalled();
    expect(screen.getByText('users.removeRoleTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('users.removeRoleConfirm'));
    await waitFor(() => {
      expect(mockRemoveRole).toHaveBeenCalledWith('1', 'role-1');
    });
  });

  it('blocks removing your own SUPER_ADMIN role', async () => {
    const selfSuperAdmin = {
      id: 'user-1',
      email: 'admin@test.dev',
      username: 'admin',
      displayName: 'Admin Self',
      roles: [{ id: 'role-sa', name: 'SUPER_ADMIN' }],
      emailVerified: true,
      createdAt: '2025-01-01T00:00:00.000Z',
    };
    mockList.mockResolvedValue({
      data: { users: [selfSuperAdmin], total: 1 },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockGetById.mockResolvedValue({
      data: selfSuperAdmin,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    mockRolesList.mockResolvedValue({
      data: {
        roles: [
          { id: 'role-sa', name: 'SUPER_ADMIN', accountId: null, deletedAt: null, userCount: 1 },
        ],
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {},
    });
    renderWithProviders(<UsersTable />);
    await screen.findByText('Admin Self');

    fireEvent.click(screen.getByText('Admin Self'));
    await screen.findByText('users.detailTitle');

    // findByLabelText: see comment in the previous test — poll until the drawer's
    // data has loaded and the guarded remove button is rendered.
    const removeButton = await screen.findByLabelText('users.cannotRemoveOwnSuperAdmin');
    expect(removeButton).toBeDisabled();
    fireEvent.click(removeButton);
    expect(screen.queryByText('users.removeRoleTitle')).not.toBeInTheDocument();
    expect(mockRemoveRole).not.toHaveBeenCalled();
  });
});
