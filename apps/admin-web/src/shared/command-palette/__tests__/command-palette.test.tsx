import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';

import { CommandPalette } from '../command-palette';
import { CommandPaletteProvider } from '../command-palette-context';

// cmdk requires both scrollIntoView and ResizeObserver — jsdom does not implement either
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
  globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })) as typeof ResizeObserver;
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultVal?: string | Record<string, unknown>): string => {
      if (typeof defaultVal === 'string') return defaultVal;
      return key;
    },
  }),
}));

const mockState = vi.hoisted(() => ({ allowAll: true }));

// Provide a standalone Permission stub so nav-items.ts resolves without the real module.
vi.mock('@shared/permissions', () => ({
  Permission: {
    VIEW_DASHBOARD: 'dashboard:view',
    VIEW_ACCOUNTS: 'accounts:view',
    VIEW_USERS: 'users:view',
    VIEW_ROLES: 'roles:view',
    VIEW_PRODUCTS: 'products:view',
    VIEW_SCRAPERS: 'scrapers:view',
    VIEW_RULES: 'rules:view',
    VIEW_QUEUES: 'queues:view',
    VIEW_SETTINGS: 'settings:view',
  },
  useHasPermission:
    () =>
    (p: unknown): boolean =>
      mockState.allowAll ? true : p === 'dashboard:view',
}));

vi.mock('@shared/auth', () => ({
  useLogout: () => vi.fn(),
}));

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPalette(): void {
  render(
    <MemoryRouter>
      <CommandPaletteProvider>
        <CommandPalette />
        <LocationProbe />
      </CommandPaletteProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockState.allowAll = true;
});

describe('CommandPalette', () => {
  it('opens with Ctrl+K and shows navigation items', async () => {
    const user = userEvent.setup();
    renderPalette();

    expect(screen.queryByPlaceholderText('Type a command or search…')).not.toBeInTheDocument();

    await user.keyboard('{Control>}k{/Control}');

    expect(await screen.findByPlaceholderText('Type a command or search…')).toBeInTheDocument();
    expect(screen.getByText('nav.dashboard')).toBeInTheDocument();
    expect(screen.getByText('nav.queues')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });

  it('filters items while typing', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Control>}k{/Control}');
    await user.type(screen.getByPlaceholderText('Type a command or search…'), 'rules');

    await waitFor(() => {
      expect(screen.queryByText('nav.accounts')).not.toBeInTheDocument();
    });
    expect(screen.getByText('nav.rules')).toBeInTheDocument();
  });

  it('navigates and closes when an item is selected', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Control>}k{/Control}');
    await user.click(await screen.findByText('nav.queues'));

    expect(screen.getByTestId('location').textContent).toBe('/queues');
    expect(screen.queryByPlaceholderText('Type a command or search…')).not.toBeInTheDocument();
  });

  it('closes with Escape', async () => {
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Control>}k{/Control}');
    await screen.findByPlaceholderText('Type a command or search…');
    await user.keyboard('{Escape}');

    expect(screen.queryByPlaceholderText('Type a command or search…')).not.toBeInTheDocument();
  });

  it('hides navigation items the user has no permission for', async () => {
    mockState.allowAll = false;
    const user = userEvent.setup();
    renderPalette();

    await user.keyboard('{Control>}k{/Control}');

    expect(await screen.findByText('nav.dashboard')).toBeInTheDocument();
    expect(screen.queryByText('nav.users')).not.toBeInTheDocument();
    expect(screen.queryByText('nav.queues')).not.toBeInTheDocument();
  });
});
