import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import type { RoleViewModel } from '../view-models/role-view-model';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (options) {
        return key.replace('{{count}}', String(options.count));
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

const mockUseGetRoles = vi.fn();
const mockUseCreateRole = vi.fn();
const mockUseDeleteRole = vi.fn();

vi.mock('../hooks/useGetRoles', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useGetRoles: (...args: unknown[]) => mockUseGetRoles(...args),
}));

vi.mock('../hooks/useCreateRole', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useCreateRole: (...args: unknown[]) => mockUseCreateRole(...args),
}));

vi.mock('../hooks/useDeleteRole', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  useDeleteRole: (...args: unknown[]) => mockUseDeleteRole(...args),
}));

// ---------------------------------------------------------------------------
// Component under test
// ---------------------------------------------------------------------------

import { RolesTable } from '../components/roles-table';

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

const mockRoles: RoleViewModel[] = [
  { id: '1', name: 'SUPER_ADMIN', userCount: 2 },
  { id: '2', name: 'ACCOUNT_OWNER', userCount: 15 },
  { id: '3', name: 'MEMBER', userCount: 0 },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RolesTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: loading state
    mockUseGetRoles.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    mockUseCreateRole.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });

    mockUseDeleteRole.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
  });

  it('shows loading skeleton while fetching roles', () => {
    renderWithProviders(<RolesTable />);
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state with retry when fetch fails', () => {
    const refetch = vi.fn();
    mockUseGetRoles.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network error'),
      refetch,
    });

    renderWithProviders(<RolesTable />);
    expect(screen.getByText('roles.error.title')).toBeInTheDocument();
    expect(screen.getByText('common.retry')).toBeInTheDocument();

    fireEvent.click(screen.getByText('common.retry'));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('shows empty state when no roles exist', () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: [], total: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RolesTable />);
    expect(screen.getByText('roles.empty.title')).toBeInTheDocument();
    expect(screen.getByText('roles.empty.description')).toBeInTheDocument();
  });

  it('renders the list of roles in a table', () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: mockRoles, total: mockRoles.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    renderWithProviders(<RolesTable />);

    // Header
    expect(screen.getByText('roles.table.name')).toBeInTheDocument();
    expect(screen.getByText('roles.table.users')).toBeInTheDocument();

    // Rows
    expect(screen.getByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT_OWNER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();

    // User counts
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('opens inline create form when create button is clicked', async () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: mockRoles, total: mockRoles.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const createMutate = vi.fn();
    mockUseCreateRole.mockReturnValue({
      mutate: createMutate,
      isPending: false,
    });

    renderWithProviders(<RolesTable />);

    // Click create button
    const createBtn = screen.getByText('roles.create.button');
    await userEvent.click(createBtn);

    // Inline form should appear
    expect(screen.getByPlaceholderText('roles.create.placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'roles.create.save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'roles.create.cancel' })).toBeInTheDocument();
  });

  it('calls createRole mutate when form is submitted', async () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: mockRoles, total: mockRoles.length },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const createMutate = vi.fn();
    mockUseCreateRole.mockReturnValue({
      mutate: createMutate,
      isPending: false,
    });

    renderWithProviders(<RolesTable />);

    // Open form
    await userEvent.click(screen.getByText('roles.create.button'));

    // Type role name
    const input = screen.getByPlaceholderText('roles.create.placeholder');
    await userEvent.type(input, 'MODERATOR');

    // Submit
    await userEvent.click(screen.getByRole('button', { name: 'roles.create.save' }));

    expect(createMutate).toHaveBeenCalledWith({ name: 'MODERATOR' }, expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('shows delete confirmation AlertDialog and calls delete on confirm', async () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: [mockRoles[0]], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const deleteMutate = vi.fn();
    mockUseDeleteRole.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    });

    renderWithProviders(<RolesTable />);

    // Find delete button (first role row)
    const deleteBtn = screen.getByLabelText('roles.delete.label');
    await userEvent.click(deleteBtn);

    // AlertDialog should appear
    expect(screen.getByText('roles.delete.title')).toBeInTheDocument();
    expect(screen.getByText('roles.delete.confirm')).toBeInTheDocument();

    // Confirm delete
    await userEvent.click(screen.getByText('roles.delete.confirm'));

    expect(deleteMutate).toHaveBeenCalledWith('1', expect.objectContaining({ onSuccess: expect.any(Function) }));
  });

  it('cancels delete when cancel is clicked in AlertDialog', async () => {
    mockUseGetRoles.mockReturnValue({
      data: { items: [mockRoles[0]], total: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    const deleteMutate = vi.fn();
    mockUseDeleteRole.mockReturnValue({
      mutate: deleteMutate,
      isPending: false,
    });

    renderWithProviders(<RolesTable />);

    // Open dialog
    await userEvent.click(screen.getByLabelText('roles.delete.label'));

    // Cancel
    await userEvent.click(screen.getByText('roles.delete.cancel'));

    // Dialog should close and mutate should NOT have been called
    await waitFor(() => {
      expect(screen.queryByText('roles.delete.title')).not.toBeInTheDocument();
    });
    expect(deleteMutate).not.toHaveBeenCalled();
  });
});
