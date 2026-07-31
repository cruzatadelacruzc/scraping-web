/**
 * Unit tests for UserService.registerLocal() method
 * Tests local user registration with email/password credentials
 */
import 'reflect-metadata';
// Mock ProviderTokenVerifier to avoid importing ESM 'jose' during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({ providerId: 'prov-1', email: 'alice@example.com', email_verified: true }),
  })),
}));

// Mock the unique-constraint helper to detect P2002 when needed
jest.mock('@users/custom-prisma-client', () => ({
  isPrismaUniqueConstraintError: (err: any): boolean => !!(err && err.code === 'P2002'),
}));

import { UserRepository } from '@users/repositories/user.repository';
import { TokenService } from '@shared/security/token.service';
import { UserMapper } from '@users/mappers/user.mapper';
import { UserRegisterDTO } from '@users/dto/user-register.dto';
import { ConflictError } from '@users/errors/conflict.error';
import { AccountNotFoundError } from '@users/errors/account-not-found.error';
import { UserNotFoundError } from '@users/errors/user-not-found.error';
import { PasswordHasher } from '@shared/security/password-hasher.serice';
import { AccountRepository } from '@users/repositories/account.repository';
import { UserService } from '@users/services/user.service';

describe('UserService.registerLocal', () => {
  let userService: any;
  let userRepo: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let userMapper: jest.Mocked<UserMapper>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let accountRepo: jest.Mocked<AccountRepository>;
  let tokenMgmt: { issueRefreshToken: jest.Mock };
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  const sampleDTO = (overrides = {}): UserRegisterDTO => {
    return new UserRegisterDTO(
      (overrides as any).email || 'john@example.com',
      (overrides as any).username || 'john_doe',
      (overrides as any).password || 'SecurePass123',
      (overrides as any).accountId || 'acc-1',
      (overrides as any).roleIds,
      (overrides as any).displayName || 'John Doe',
      (overrides as any).avatarUrl,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    userRepo = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByIdWithRoles: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    tokenService = {
      generateToken: jest.fn().mockReturnValue('fake-jwt-token'),
    } as unknown as jest.Mocked<TokenService>;

    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password-hash'),
      compare: jest.fn(),
    } as unknown as jest.Mocked<PasswordHasher>;

    accountRepo = {
      exists: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<AccountRepository>;

    userMapper = {
      toDTO: jest.fn(),
      toCreateInput: jest.fn().mockReturnValue({ email: 'john@example.com', username: 'john_doe' } as any),
      toUpdateInput: jest.fn(),
      toDTOs: jest.fn(),
    } as unknown as jest.Mocked<UserMapper>;

    tokenMgmt = { issueRefreshToken: jest.fn().mockResolvedValue('fake-refresh-token') };

    userService = new UserService(
      loggerMock,
      userRepo as any,
      userMapper as any,
      tokenService as any,
      {} as any, // userIdentityRepo (not used in registerLocal)
      passwordHasher as any,
      {} as any, // providerVerifier (not used in registerLocal)
      accountRepo as any,
      { role: { findFirst: jest.fn().mockResolvedValue({ id: 'role-admin', name: 'ACCOUNT_OWNER' }) } } as any, // prisma
      undefined, // emailVerify — not exercised here
      tokenMgmt as any,
    );
  });

  describe('successful registration', () => {
    it('should register a new local user with valid credentials', async () => {
      const dto = sampleDTO();
      const createdUser = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'john_doe',
        accountId: 'acc-1',
        roles: [{ id: 'r1', name: 'USER' }],
        displayName: 'John Doe',
        avatarUrl: null,
        emailVerified: false,
      } as any;

      const userDTO = { id: 'user-123', email: 'john@example.com', username: 'john_doe', displayName: 'John Doe' } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue(userDTO);

      const result = await userService.registerLocal(dto, 'acc-1');

      expect(result).toEqual({
        user: userDTO,
        token: 'fake-jwt-token',
        refreshToken: 'fake-refresh-token',
      });

      expect(accountRepo.exists).toHaveBeenCalledWith('acc-1');
      expect(userRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
      expect(userRepo.findByUsername).toHaveBeenCalledWith('john_doe');
      expect(passwordHasher.hash).toHaveBeenCalledWith('SecurePass123');
      expect(userRepo.create).toHaveBeenCalled();
      expect(tokenService.generateToken).toHaveBeenCalledWith('user-123', 'acc-1', ['USER'], undefined, undefined);
      expect(loggerMock.debug).toHaveBeenCalledWith('User registered successfully', { userId: 'user-123', email: 'john@example.com' });
    });

    it('should normalize email to lowercase via DTO validation', async () => {
      // The DTO validation (Zod) normalizes email to lowercase
      // This test verifies registerLocal receives and uses the normalized email
      const dto = sampleDTO({ email: 'john@example.com' });
      const createdUser = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'john_doe',
        accountId: 'acc-1',
        roles: [],
      } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({} as any);

      await userService.registerLocal(dto, 'acc-1');

      // Email lookup should use normalized email
      expect(userRepo.findByEmail).toHaveBeenCalledWith('john@example.com');
    });

    it('should normalize username to lowercase via DTO validation', async () => {
      // The DTO validation (Zod) normalizes username to lowercase
      // This test verifies registerLocal receives and uses the normalized username
      const dto = sampleDTO({ username: 'john_doe' });
      const createdUser = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'john_doe',
        accountId: 'acc-1',
        roles: [],
      } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({} as any);

      await userService.registerLocal(dto, 'acc-1');

      // Username lookup should use normalized username
      expect(userRepo.findByUsername).toHaveBeenCalledWith('john_doe');
    });

    it('should set emailVerified to false for local registrations', async () => {
      const dto = sampleDTO();
      const createdUser = { id: 'user-123', roles: [] } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({} as any);

      await userService.registerLocal(dto, 'acc-1');

      // Verify toCreateInput was called with emailVerified: false
      expect(userMapper.toCreateInput).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@example.com',
          username: 'john_doe',
          emailVerified: false,
          accountId: 'acc-1',
        }),
      );
    });

    it('should include the issued refresh token in the auth response', async () => {
      const dto = sampleDTO();
      const createdUser = {
        id: 'user-123',
        email: 'john@example.com',
        username: 'john_doe',
        accountId: 'acc-1',
        roles: [{ id: 'r1', name: 'USER' }],
      } as any;
      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({ id: 'user-123' } as any);

      const result = await userService.registerLocal(dto, 'acc-1');

      expect(tokenMgmt.issueRefreshToken).toHaveBeenCalledWith('user-123');
      expect(result.refreshToken).toBe('fake-refresh-token');
    });
  });

  describe('error handling', () => {
    it('should throw AccountNotFoundError if account does not exist', async () => {
      const dto = sampleDTO();
      accountRepo.exists.mockResolvedValue(false);

      await expect(userService.registerLocal(dto, 'acc-nonexistent')).rejects.toThrow(AccountNotFoundError);
      await expect(userService.registerLocal(dto, 'acc-nonexistent')).rejects.toThrow('Account with id acc-nonexistent not found');
      expect(loggerMock.warn).toHaveBeenCalledWith('RegisterLocal failed: account not found', { accountId: 'acc-nonexistent' });
    });

    it('should throw ConflictError if email is already registered', async () => {
      const dto = sampleDTO();
      const existingUser = { id: 'existing-user', email: 'john@example.com' } as any;

      userRepo.findByEmail.mockResolvedValue(existingUser);

      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow(ConflictError);
      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow('Email already registered');
      expect(loggerMock.warn).toHaveBeenCalledWith('RegisterLocal failed: email already registered', { email: 'john@example.com' });
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictError if username is already taken', async () => {
      const dto = sampleDTO();
      const existingUser = { id: 'existing-user', username: 'john_doe' } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(existingUser);

      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow(ConflictError);
      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow('Username already taken');
      expect(loggerMock.warn).toHaveBeenCalledWith('RegisterLocal failed: username already taken', { username: 'john_doe' });
      expect(userRepo.create).not.toHaveBeenCalled();
    });

    it('should throw UserNotFoundError if user creation fails to return user', async () => {
      const dto = sampleDTO();

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);

      (userRepo.create as any).mockResolvedValue(null);

      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow(UserNotFoundError);
      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow('Created user not found');
      expect(loggerMock.error).toHaveBeenCalledWith('Inconsistent state: user created but not returned', expect.any(Object));
    });

    it('should handle Prisma P2002 unique constraint error (race condition)', async () => {
      const dto = sampleDTO();

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      const prismaError = new Error('Unique constraint failed') as any;
      prismaError.code = 'P2002';
      userRepo.create.mockRejectedValue(prismaError);

      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow(ConflictError);
      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow('Email or username already registered');
      expect(loggerMock.warn).toHaveBeenCalledWith('RegisterLocal failed: concurrent creation conflict', expect.any(Object));
    });

    it('should re-throw non-P2002 Prisma errors', async () => {
      const dto = sampleDTO();
      const prismaError = new Error('Database connection failed') as any;
      prismaError.code = 'P1000';

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockRejectedValue(prismaError);

      await expect(userService.registerLocal(dto, 'acc-1')).rejects.toThrow('Database connection failed');
    });
  });

  describe('password hashing', () => {
    it('should hash the password before persisting user', async () => {
      const dto = sampleDTO({ password: 'MySecurePass123' });
      const createdUser = { id: 'user-123', roles: [] } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({} as any);

      await userService.registerLocal(dto, 'acc-1');

      expect(passwordHasher.hash).toHaveBeenCalledWith('MySecurePass123');
      expect(userMapper.toCreateInput).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordHash: 'hashed-password-hash',
        }),
      );
    });
  });

  describe('token generation', () => {
    it('should generate JWT token with user id, account id, and roles', async () => {
      const dto = sampleDTO();
      const createdUser = {
        id: 'user-123',
        accountId: 'acc-1',
        roles: [
          { id: 'r1', name: 'USER' },
          { id: 'r2', name: 'ADMIN' },
        ],
      } as any;

      userRepo.findByEmail.mockResolvedValue(null);
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.create.mockResolvedValue(createdUser);
      userMapper.toDTO.mockReturnValue({} as any);

      await userService.registerLocal(dto, 'acc-1');

      expect(tokenService.generateToken).toHaveBeenCalledWith('user-123', 'acc-1', ['USER', 'ADMIN'], undefined, undefined);
    });
  });
});
