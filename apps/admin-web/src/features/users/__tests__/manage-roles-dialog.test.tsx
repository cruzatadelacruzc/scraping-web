import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

vi.mock('@shared/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const { mockGetRoles, mockToggleRole } = vi.hoisted(() => ({
  mockGetRoles: vi.fn(),
  mockToggleRole: vi.fn(),
}));

vi.mock('../services/users-service', () => ({
  usersService: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    getRoles: (...args: unknown[]) => mockGetRoles(...args),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    toggleRole: (...args: unknown[]) => mockToggleRole(...args),
  },
}));

import { ManageRolesDialog } from '../components/manage-roles-dialog';

const superAdminRole = {
  id: 'r-super',
  name: 'SUPER_ADMIN',
  accountId: null,
  deletedAt: null,
  userCount: 1,
};
const ownerRole = {
  id: 'r-owner',
  name: 'ACCOUNT_OWNER',
  accountId: null,
  deletedAt: null,
  userCount: 2,
};
const memberRole = {
  id: 'r-member',
  name: 'MEMBER',
  accountId: null,
  deletedAt: '2026-07-01T00:00:00.000Z',
  userCount: 0,
};

const axiosOk = (data: unknown) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config: {},
});

function renderDialog(): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ManageRolesDialog open onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

describe('ManageRolesDialog', () => {
  beforeEach(() => {
    mockGetRoles.mockResolvedValue(axiosOk({ roles: [superAdminRole, ownerRole, memberRole] }));
    mockToggleRole.mockResolvedValue(
      axiosOk({ role: { ...ownerRole, deletedAt: '2026-07-29T00:00:00.000Z' } }),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies the maxWidth prop as a class on the dialog panel', async () => {
    renderDialog();
    await screen.findByText('SUPER_ADMIN');

    expect(screen.getByRole('dialog')).toHaveClass('max-w-md');
  });

  it('renders the three roles with status and user count', async () => {
    renderDialog();

    expect(await screen.findByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(screen.getByText('ACCOUNT_OWNER')).toBeInTheDocument();
    expect(screen.getByText('MEMBER')).toBeInTheDocument();
    expect(screen.getAllByText('roles.active')).toHaveLength(2);
    expect(screen.getByText('roles.inactive')).toBeInTheDocument();
    expect(screen.getByText('roles.protected')).toBeInTheDocument();
  });

  it('disables the SUPER_ADMIN switch', async () => {
    renderDialog();
    await screen.findByText('SUPER_ADMIN');

    // Roles render in fixture order: [SUPER_ADMIN, ACCOUNT_OWNER, MEMBER]
    const switches = screen.getAllByRole('switch');
    expect(switches[0]).toBeDisabled();
    expect(switches[1]).not.toBeDisabled();
  });

  it('asks for confirmation before deactivating and toggles on confirm', async () => {
    renderDialog();
    await screen.findByText('ACCOUNT_OWNER');

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[1]); // ACCOUNT_OWNER — active → confirm dialog
    expect(mockToggleRole).not.toHaveBeenCalled();
    expect(screen.getByText('roles.deactivateTitle')).toBeInTheDocument();

    fireEvent.click(screen.getByText('roles.deactivateConfirm'));
    await waitFor(() => {
      expect(mockToggleRole).toHaveBeenCalledWith('r-owner');
    });
  });

  it('reactivates an inactive role without confirmation', async () => {
    renderDialog();
    await screen.findByText('MEMBER');

    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[2]); // MEMBER — inactive → direct toggle
    expect(screen.queryByText('roles.deactivateTitle')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(mockToggleRole).toHaveBeenCalledWith('r-member');
    });
  });

  it('shows the error state with a Retry button that refetches the roles', async () => {
    mockGetRoles.mockRejectedValueOnce(new Error('boom'));
    renderDialog();

    expect(await screen.findByText('roles.loadError')).toBeInTheDocument();

    // Retry refetches — the beforeEach mock resolves on the second call
    fireEvent.click(screen.getByText('roles.retry'));
    expect(await screen.findByText('SUPER_ADMIN')).toBeInTheDocument();
    expect(mockGetRoles).toHaveBeenCalledTimes(2);
  });

  it('disables every switch while a toggle mutation is pending', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockToggleRole.mockReturnValue(new Promise(() => {}));
    renderDialog();
    await screen.findByText('MEMBER');

    fireEvent.click(screen.getAllByRole('switch')[2]); // MEMBER — direct toggle, hangs

    await waitFor(() => {
      for (const sw of screen.getAllByRole('switch')) {
        expect(sw).toBeDisabled();
      }
    });
  });

  it('keeps the confirmation dialog open with disabled buttons while deactivation is pending', async () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockToggleRole.mockReturnValue(new Promise(() => {}));
    renderDialog();
    await screen.findByText('ACCOUNT_OWNER');

    fireEvent.click(screen.getAllByRole('switch')[1]); // ACCOUNT_OWNER — active → confirm
    fireEvent.click(screen.getByText('roles.deactivateConfirm'));

    // In-flight: dialog stays open, both buttons disabled (rule 5.3 in admin-web-ui.md)
    await waitFor(() => {
      expect(screen.getByText('roles.deactivateConfirm')).toBeDisabled();
    });
    expect(screen.getByText('roles.deactivateTitle')).toBeInTheDocument();
    expect(screen.getByText('roles.cancel')).toBeDisabled();
  });

  it('toggles a role with the keyboard (Space on a focused switch)', async () => {
    // Hang the mutation so no post-assertion state updates leak outside act()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    mockToggleRole.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    renderDialog();
    await screen.findByText('MEMBER');

    const memberSwitch = screen.getAllByRole('switch')[2];
    memberSwitch.focus();
    // act(): TanStack Query flushes the isPending update on a microtask
    // that lands between user-event's internal awaits
    await act(async () => {
      await user.keyboard(' ');
    });

    expect(mockToggleRole).toHaveBeenCalledWith('r-member');
  });
});
