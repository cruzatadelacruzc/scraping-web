import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../auth-service';
import type { ITokenStorage } from '../token-storage.interface';
import type { AuthResponse } from '../types';
import { RoleType } from '../types';

function mockResponse(data: AuthResponse): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve({ status: 'success', message: 'OK', data }),
  } as Response;
}

function mockErrorResponse(status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ message: 'Error' }),
  } as Response;
}

describe('AuthService', () => {
  let storage: ITokenStorage;
  let authService: AuthService;

  beforeEach(() => {
    storage = {
      getAccessToken: vi.fn().mockReturnValue(null),
      getRefreshToken: vi.fn().mockReturnValue(null),
      setAccessToken: vi.fn(),
      setRefreshToken: vi.fn(),
      clear: vi.fn(),
    };
    authService = new AuthService(storage);
  });

  describe('login', () => {
    const loginResponse: AuthResponse = {
      token: 'jwt-token',
      refreshToken: 'refresh-token',
      user: {
        id: 'user-1',
        email: 'admin@test.dev',
        accountId: 'account-1',
        roles: [{ id: '550e8400-e29b-41d4-a716-446655440001', name: 'SUPER_ADMIN' }],
      },
    };

    it('stores tokens and returns AuthSession on successful login', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(loginResponse));

      const session = await authService.login('admin@test.dev', 'password');

      expect(storage.setAccessToken).toHaveBeenCalledWith('jwt-token');
      expect(storage.setRefreshToken).toHaveBeenCalledWith('refresh-token');
      expect(session.userId).toBe('user-1');
      expect(session.accountId).toBe('account-1');
      expect(session.roles).toEqual([RoleType.SUPER_ADMIN]);
      expect(session.expiresAt).toBeGreaterThan(Date.now());
    });

    it('throws on 401 response', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockErrorResponse(401));

      await expect(authService.login('bad', 'wrong')).rejects.toThrow('Invalid credentials');
    });
  });

  describe('refresh', () => {
    const refreshResponse: AuthResponse = {
      token: 'new-jwt',
      refreshToken: 'new-refresh',
      user: {
        id: 'user-1',
        email: 'admin@test.dev',
        accountId: 'account-1',
        roles: [{ id: '550e8400-e29b-41d4-a716-446655440002', name: 'ACCOUNT_OWNER' }],
      },
    };

    it('stores new tokens and returns updated AuthSession', async () => {
      (storage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('old-refresh');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockResponse(refreshResponse));

      const session = await authService.refresh();

      expect(storage.setAccessToken).toHaveBeenCalledWith('new-jwt');
      expect(storage.setRefreshToken).toHaveBeenCalledWith('new-refresh');
      expect(session.roles).toEqual([RoleType.ACCOUNT_OWNER]);
    });

    it('throws and clears storage when no refresh token is available', async () => {
      (storage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      await expect(authService.refresh()).rejects.toThrow('No refresh token available');
    });

    it('throws and clears storage on failed refresh', async () => {
      (storage.getRefreshToken as ReturnType<typeof vi.fn>).mockReturnValue('bad-refresh');
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(mockErrorResponse(401));

      await expect(authService.refresh()).rejects.toThrow('Session expired');
      expect(storage.clear).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('clears all tokens', () => {
      authService.logout();
      expect(storage.clear).toHaveBeenCalled();
    });
  });
});
