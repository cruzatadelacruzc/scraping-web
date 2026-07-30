import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { SideNav } from '../sidenav';

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

describe('SideNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MEMBER sees only Dashboard item', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u1',
      accountId: 'a1',
      roles: ['MEMBER'],
      username: 'member',
      email: 'member@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    render(
      <MemoryRouter>
        <SideNav />
      </MemoryRouter>,
    );

    // MEMBER has VIEW_DASHBOARD → visible
    expect(screen.getByText('nav.dashboard')).toBeInTheDocument();

    // Items the MEMBER lacks
    expect(screen.queryByText('nav.accounts')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.users')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.products')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.scrapers')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.rules')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.queues')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.settings')).not.toBeInTheDocument();
  });

  it('SUPER_ADMIN sees all nav items', () => {
    mockUseCurrentUser.mockReturnValue({
      userId: 'u2',
      accountId: 'a1',
      roles: ['SUPER_ADMIN'],
      username: 'super',
      email: 'super@test.dev',
      expiresAt: Date.now() + 86400000,
    });

    render(
      <MemoryRouter>
        <SideNav />
      </MemoryRouter>,
    );

    expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
    expect(screen.getByText('nav.accounts')).toBeInTheDocument();
    expect(screen.getByText('nav.users')).toBeInTheDocument();
    expect(screen.getByText('nav.products')).toBeInTheDocument();
    expect(screen.getByText('nav.scrapers')).toBeInTheDocument();
    expect(screen.getByText('nav.rules')).toBeInTheDocument();
    expect(screen.getByText('nav.queues')).toBeInTheDocument();
    expect(screen.getByText('nav.settings')).toBeInTheDocument();
  });
});
