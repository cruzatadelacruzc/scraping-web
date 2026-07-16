import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { Permission } from '../permission';
import { RequirePermission } from '../require-permission';

const { mockUseCurrentUser } = vi.hoisted(() => ({
  mockUseCurrentUser: vi.fn(),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock('@shared/auth', () => ({
  useCurrentUser: mockUseCurrentUser,
  RoleType: {
    SUPER_ADMIN: 'SUPER_ADMIN',
    ACCOUNT_OWNER: 'ACCOUNT_OWNER',
    MEMBER: 'MEMBER',
  },
}));

describe('RequirePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has at least one required permission', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u1',
      accountId: 'a1',
      roles: ['SUPER_ADMIN'],
      username: 'admin',
      email: 'admin@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    render(
      <MemoryRouter>
        <RequirePermission permissions={[Permission.VIEW_DASHBOARD]}>
          <div>Protected Content</div>
        </RequirePermission>
      </MemoryRouter>,
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('renders forbidden view when user lacks all required permissions', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u2',
      accountId: 'a1',
      roles: ['ACCOUNT_OWNER'],
      username: 'owner',
      email: 'owner@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    render(
      <MemoryRouter>
        <RequirePermission permissions={[Permission.MANAGE_SCRAPERS]}>
          <div>Protected Content</div>
        </RequirePermission>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText('forbidden.title')).toBeInTheDocument();
    expect(screen.getByText('forbidden.description')).toBeInTheDocument();
  });

  it('forbidden view has a link to the dashboard', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u3',
      accountId: 'a1',
      roles: ['ACCOUNT_OWNER'],
      username: 'owner',
      email: 'owner@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    render(
      <MemoryRouter>
        <RequirePermission permissions={[Permission.MANAGE_SCRAPERS]}>
          <div>Protected Content</div>
        </RequirePermission>
      </MemoryRouter>,
    );

    const link = screen.getByRole('link', { name: 'forbidden.action' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });
});
