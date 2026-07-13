import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ROUTES } from '@shared/config/routes';
import { App } from '../App';

describe('App', () => {
  it('renders the login page when unauthenticated', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.LOGIN]}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText('BazaarSentinel')).toBeInTheDocument();
    expect(screen.getByText('Super Admin Console')).toBeInTheDocument();
  });

  it('redirects to login from protected routes when unauthenticated', () => {
    render(
      <MemoryRouter initialEntries={[ROUTES.DASHBOARD]}>
        <App />
      </MemoryRouter>,
    );
    // Should redirect to login since there's no auth session
    expect(screen.getByText('Super Admin Console')).toBeInTheDocument();
  });
});
