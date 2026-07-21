import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/context/AuthContext';
import { useAuth } from '@/features/auth/hooks/useAuth';

// Mock the auth API
vi.mock('@/features/auth/services/auth-api', () => ({
  authApi: {
    refreshToken: vi.fn().mockResolvedValue({
      accessToken: 'mock-access',
      refreshToken: 'mock-refresh',
      expiresIn: 3600,
    }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock('@/features/auth/services/token-storage', () => ({
  tokenStorage: {
    hasValidToken: vi.fn().mockReturnValue(false),
    setTokens: vi.fn(),
    clear: vi.fn(),
  },
  mapTokensToStorage: vi.fn((t) => t),
}));

function TestComponent() {
  const auth = useAuth();
  return <div data-testid="auth-state">{auth.isLoading ? 'loading' : 'ready'}</div>;
}

describe('AuthContext', () => {
  it('should provide default unauthenticated state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('auth-state')).toHaveTextContent('ready');
    });
  });
});