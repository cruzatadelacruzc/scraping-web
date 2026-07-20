import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/features/auth/context/AuthContext';

vi.mock('@/features/auth/services/auth-api', () => ({
  authApi: {
    refreshToken: vi.fn().mockResolvedValue({ accessToken: 'mock', refreshToken: 'mock', expiresIn: 3600 }),
    login: vi.fn().mockResolvedValue({ user: { id: '1', email: 'test@test.com', name: 'Test', role: 'ACCOUNT_OWNER', verified: true }, accessToken: 'mock', refreshToken: 'mock', expiresIn: 3600 }),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock('@/features/auth/services/token-storage', () => ({
  tokenStorage: {
    hasValidToken: vi.fn().mockReturnValue(false),
    setTokens: vi.fn(),
    clear: vi.fn(),
  },
  mapTokensToStorage: (t: any) => t,
}));

function TestComponent() {
  const auth = useAuth();
  return <div data-testid="auth-state">{JSON.stringify({ user: auth.user?.name, loading: auth.isLoading })}</div>;
}

describe('AuthContext', () => {
  it('should provide default unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('"user":null');
    });
  });
});