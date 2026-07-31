import 'reflect-metadata';
import { TokenManagementService } from '@users/services/token-management.service';
import { TokenRepository } from '@users/repositories/token.repository';
import { UserRepository } from '@users/repositories/user.repository';
import { TokenService } from '@shared/security/token.service';
import { IRefreshTokenResult } from '@users/services/dto/refresh-token-result.dto';

describe('TokenManagementService', () => {
  let svc: TokenManagementService;
  let tokenRepo: jest.Mocked<TokenRepository>;
  let userRepo: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), context: '' } as any;

  const mockUser = {
    id: 'user-1',
    accountId: 'account-1',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    emailVerified: true,
    passwordHash: 'hashed',
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    roles: [{ id: 'role-1', name: 'ACCOUNT_OWNER' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    tokenRepo = {
      findRefreshTokenByHash: jest.fn(),
      createRefreshToken: jest.fn(),
      replaceRefreshToken: jest.fn(),
      revokeRefreshTokenFamily: jest.fn(),
      revokeAllUserRefreshTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenRepository>;

    userRepo = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    tokenService = {
      generateToken: jest.fn().mockReturnValue('jwt-token'),
      verifyToken: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    svc = new TokenManagementService(loggerMock, tokenRepo, tokenService, userRepo);
  });

  describe('rotateRefreshToken', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const storedToken = {
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'old-hash',
      family: 'family-1',
      replacedBy: null,
      revokedAt: null,
      expiresAt: future,
      createdAt: now,
    };

    it('should return null when token is not found or expired', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue(null);

      const result = await svc.rotateRefreshToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null and revoke family when token was already replaced (theft detection)', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        replacedBy: 'token-2',
        revokedAt: now,
      });
      tokenRepo.revokeRefreshTokenFamily.mockResolvedValue();

      const result = await svc.rotateRefreshToken('stolen-token');

      expect(result).toBeNull();
      expect(tokenRepo.revokeRefreshTokenFamily).toHaveBeenCalledWith('family-1');
    });

    it('should return null without revoking the family when token is revoked but not replaced', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        revokedAt: now,
      });

      const result = await svc.rotateRefreshToken('revoked-token');

      expect(result).toBeNull();
      expect(tokenRepo.revokeRefreshTokenFamily).not.toHaveBeenCalled();
      expect(tokenRepo.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should return null when token is expired', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(now.getTime() - 1000),
      });

      const result = await svc.rotateRefreshToken('expired-token');

      expect(result).toBeNull();
      expect(tokenRepo.createRefreshToken).not.toHaveBeenCalled();
    });

    it('should return user context alongside the new token on success', async () => {
      const newTokenRecord = {
        id: 'token-2',
        userId: 'user-1',
        tokenHash: 'new-hash',
        family: 'family-1',
        replacedBy: null,
        revokedAt: null,
        expiresAt: future,
        createdAt: now,
      };

      tokenRepo.findRefreshTokenByHash.mockResolvedValue(storedToken);
      tokenRepo.createRefreshToken.mockResolvedValue(newTokenRecord);
      tokenRepo.replaceRefreshToken.mockResolvedValue();
      userRepo.findById.mockResolvedValue(mockUser);

      const result = await svc.rotateRefreshToken('valid-token');

      expect(result).not.toBeNull();
      const r = result as IRefreshTokenResult;
      expect(typeof r.refreshToken).toBe('string');
      expect(r.refreshToken.length).toBeGreaterThan(0);
      expect(r.userId).toBe('user-1');
      expect(r.accountId).toBe('account-1');
      expect(r.roles).toEqual(['ACCOUNT_OWNER']);
    });

    it('should return null when user is not found for the stored token', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue(storedToken);
      tokenRepo.createRefreshToken.mockResolvedValue({
        ...storedToken,
        id: 'token-2',
        tokenHash: 'new-hash',
      });
      tokenRepo.replaceRefreshToken.mockResolvedValue();
      userRepo.findById.mockResolvedValue(null);

      const result = await svc.rotateRefreshToken('valid-token-no-user');

      expect(result).toBeNull();
    });

    it('should extract role names from user roles', async () => {
      const userWithMultipleRoles = {
        ...mockUser,
        roles: [
          { id: 'role-1', name: 'ACCOUNT_OWNER' },
          { id: 'role-2', name: 'SUPER_ADMIN' },
        ],
      };

      const newTokenRecord = {
        id: 'token-3',
        userId: 'user-1',
        tokenHash: 'multi-role-hash',
        family: 'family-1',
        replacedBy: null,
        revokedAt: null,
        expiresAt: future,
        createdAt: now,
      };

      tokenRepo.findRefreshTokenByHash.mockResolvedValue(storedToken);
      tokenRepo.createRefreshToken.mockResolvedValue(newTokenRecord);
      tokenRepo.replaceRefreshToken.mockResolvedValue();
      userRepo.findById.mockResolvedValue(userWithMultipleRoles);

      const result = await svc.rotateRefreshToken('valid-token-multi-role');

      expect(result).not.toBeNull();
      const r = result as IRefreshTokenResult;
      expect(r.roles).toContain('ACCOUNT_OWNER');
      expect(r.roles).toContain('SUPER_ADMIN');
    });
  });

  describe('revokeRefreshToken', () => {
    const now = new Date();
    const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    it('should revoke an active token by its raw value', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash-1',
        family: 'family-1',
        replacedBy: null,
        revokedAt: null,
        expiresAt: future,
        createdAt: now,
      });

      await svc.revokeRefreshToken('active-token');

      expect(tokenRepo.revokeRefreshToken).toHaveBeenCalledWith('token-1');
    });

    it('should not re-revoke an already-revoked token', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash-1',
        family: 'family-1',
        replacedBy: null,
        revokedAt: now,
        expiresAt: future,
        createdAt: now,
      });

      await svc.revokeRefreshToken('already-revoked-token');

      expect(tokenRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });

    it('should do nothing when the token does not exist', async () => {
      tokenRepo.findRefreshTokenByHash.mockResolvedValue(null);

      await svc.revokeRefreshToken('unknown-token');

      expect(tokenRepo.revokeRefreshToken).not.toHaveBeenCalled();
    });
  });
});
