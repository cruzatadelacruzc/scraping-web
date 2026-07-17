import 'reflect-metadata';
import { AuthService } from '@users/services/auth.service';
import { UserRepository } from '@users/repositories/user.repository';
import { TokenService } from '@shared/security/token.service';
import { PasswordHasher } from '@shared/security/password-hasher.serice';
import { UserMapper } from '@users/mappers/user.mapper';
import { UserLoginDTO } from '@users/dto/user-login.dto';
import { LoginRateLimitService } from '@users/services/login-rate-limit.service';
import { TokenManagementService } from '@users/services/token-management.service';
import { LoginAttemptRepository } from '@users/repositories/login-attempt.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let userRepo: jest.Mocked<UserRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let passwordHasher: jest.Mocked<PasswordHasher>;
  let userMapper: jest.Mocked<UserMapper>;
  let rateLimiter: jest.Mocked<LoginRateLimitService>;
  let tokenMgmt: jest.Mocked<TokenManagementService>;
  let loginAttemptRepo: jest.Mocked<LoginAttemptRepository>;
  const loggerMock = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn(), context: '' } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    userRepo = {
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      findByIdWithRoles: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createWithIdentity: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    tokenService = {
      generateToken: jest.fn().mockReturnValue('jwt-token'),
      verifyToken: jest.fn(),
    } as unknown as jest.Mocked<TokenService>;

    passwordHasher = {
      hash: jest.fn(),
      compare: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<PasswordHasher>;

    userMapper = {
      toDTO: jest.fn().mockReturnValue({ id: 'u1', email: 'test@example.com', username: 'testuser' } as any),
      toCreateInput: jest.fn(),
      toUpdateInput: jest.fn(),
      toDTOs: jest.fn(),
    } as unknown as jest.Mocked<UserMapper>;

    rateLimiter = {
      checkByIp: jest.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0, remaining: 5 }),
      checkByUsername: jest.fn().mockResolvedValue({ allowed: true, retryAfterMs: 0, remaining: 10 }),
      recordSuccessfulLogin: jest.fn(),
      destroy: jest.fn(),
    } as unknown as jest.Mocked<LoginRateLimitService>;

    tokenMgmt = {
      issueRefreshToken: jest.fn().mockResolvedValue('raw-refresh-token'),
      rotateRefreshToken: jest.fn(),
      revokeAllUserTokens: jest.fn(),
      revokeRefreshToken: jest.fn(),
    } as unknown as jest.Mocked<TokenManagementService>;

    loginAttemptRepo = {
      create: jest.fn(),
      countRecentFailedAttempts: jest.fn(),
      countRecentFailedAttemptsByUser: jest.fn(),
    } as unknown as jest.Mocked<LoginAttemptRepository>;

    authService = new AuthService(loggerMock, userRepo, userMapper, passwordHasher, tokenService, rateLimiter, tokenMgmt, loginAttemptRepo);
  });

  describe('login', () => {
    const loginDTO = new UserLoginDTO('testuser', 'password123');
    const dbUser = {
      id: 'u1',
      email: 'test@example.com',
      username: 'testuser',
      accountId: 'acc-1',
      passwordHash: 'hashed-pw',
      roles: [{ id: 'r1', name: 'ACCOUNT_OWNER' }],
      deletedAt: null,
    } as any;

    it('should login successfully with username', async () => {
      userRepo.findByUsername.mockResolvedValue(dbUser);
      passwordHasher.compare.mockResolvedValue(true);

      const result = await authService.login(loginDTO);

      expect(result.token).toBe('jwt-token');
      expect(result.refreshToken).toBe('raw-refresh-token');
      expect(result.user).toBeDefined();
      expect(tokenService.generateToken).toHaveBeenCalledWith('u1', 'acc-1', ['ACCOUNT_OWNER']);
    });

    it('should login successfully with email', async () => {
      const emailDTO = new UserLoginDTO('test@example.com', 'password123');
      userRepo.findByUsername.mockResolvedValue(null);
      userRepo.findByEmail.mockResolvedValue(dbUser);
      passwordHasher.compare.mockResolvedValue(true);

      const result = await authService.login(emailDTO);

      expect(result.token).toBe('jwt-token');
      expect(userRepo.findByEmail).toHaveBeenCalledWith('test@example.com');
    });

    it('should throw when user not found', async () => {
      userRepo.findByUsername.mockResolvedValue(null);

      await expect(authService.login(loginDTO)).rejects.toThrow('Invalid credentials');
    });

    it('should throw when password is incorrect', async () => {
      userRepo.findByUsername.mockResolvedValue(dbUser);
      passwordHasher.compare.mockResolvedValue(false);

      await expect(authService.login(loginDTO)).rejects.toThrow('Invalid credentials');
    });

    it('should throw when user has no password set', async () => {
      userRepo.findByUsername.mockResolvedValue({ ...dbUser, passwordHash: null });

      await expect(authService.login(loginDTO)).rejects.toThrow('Invalid credentials');
    });

    it('should throw when account is deactivated', async () => {
      userRepo.findByUsername.mockResolvedValue({ ...dbUser, deletedAt: new Date() });

      await expect(authService.login(loginDTO)).rejects.toThrow('deactivated');
    });
  });
});
