// test/users/user.service.registerWithProvider.spec.ts
import 'reflect-metadata';
// Mock ProviderTokenVerifier to avoid importing ESM 'jose' during tests
jest.mock('@shared/security/provider-token-verifier', () => ({
  ProviderTokenVerifier: jest.fn().mockImplementation(() => ({
    verifyProvider: jest.fn().mockResolvedValue({ providerId: 'prov-1', email: 'alice@example.com', email_verified: true }),
  })),
}));
import { UserRepository } from '@users/repositories/user.repository';
import { UserIdentityRepository } from '@users/repositories/user-identity.repository';
import { TokenService } from '@shared/security/token.service';
import { UserMapper } from '@users/mappers/user.mapper';
import { ProviderRegistrationDTO } from '@users/dto/provider-registration.dto';
import { ConflictError } from '@users/errors/conflict.error';
import { AccountNotFoundError } from '@users/errors/account-not-found.error';

// Mock the unique-constraint helper to detect P2002 when needed
jest.mock('@users/custom-prisma-client', () => ({
  isPrismaUniqueConstraintError: (err: any): boolean => !!(err && err.code === 'P2002'),
}));

describe('UserService.registerWithProvider', () => {
  let userService: any;
  let userRepo: jest.Mocked<UserRepository>;
  let userIdentityRepo: jest.Mocked<UserIdentityRepository>;
  let tokenService: jest.Mocked<TokenService>;
  let userMapper: jest.Mocked<UserMapper>;
  let passwordHasher: any;
  let providerVerifier: any;
  let accountRepo: any;
  let tokenMgmt: { issueRefreshToken: jest.Mock };
  const loggerMock = { debug: jest.fn(), error: jest.fn(), context: '' } as any;

  const sampleDTO = (overrides = {}): ProviderRegistrationDTO => {
    return new ProviderRegistrationDTO(
      (overrides as any).email || 'alice@example.com',
      (overrides as any).username || 'alice',
      (overrides as any).provider || 'google',
      (overrides as any).providerId || 'prov-1',
      (overrides as any).displayName || 'Alice',
      (overrides as any).photoUrl,
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    userRepo = {
      findByEmail: jest.fn(),
      findByIdWithRoles: jest.fn(),
      create: jest.fn(),
      createWithIdentity: jest.fn(),
      update: jest.fn(),
      findAll: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    userIdentityRepo = {
      findByProvider: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<UserIdentityRepository>;

    tokenService = {
      generateToken: jest.fn().mockReturnValue('fake-token'),
    } as unknown as jest.Mocked<TokenService>;
    passwordHasher = { hash: jest.fn(), compare: jest.fn() };
    providerVerifier = {
      verifyProvider: jest.fn().mockResolvedValue({ providerId: 'prov-1', email: 'alice@example.com', email_verified: true }),
    };
    accountRepo = { exists: jest.fn().mockResolvedValue(true) };
    tokenMgmt = { issueRefreshToken: jest.fn().mockResolvedValue('fake-refresh-token') };

    userMapper = {
      toDTO: jest.fn(),
      toCreateInput: jest.fn(),
      toUpdateInput: jest.fn(),
      toDTOs: jest.fn(),
    } as unknown as jest.Mocked<UserMapper>;

    // require the service after mocking ProviderTokenVerifier to avoid ESM module parsing issues
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UserService: UserServiceClass } = require('@users/services/user.service');
    const mockPrisma = {
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'role-admin', name: 'ACCOUNT_OWNER' }) },
    } as any;

    userService = new UserServiceClass(
      loggerMock,
      userRepo as any,
      userMapper as any,
      tokenService as any,
      userIdentityRepo as any,
      passwordHasher as any,
      providerVerifier as any,
      accountRepo as any,
      mockPrisma,
      undefined, // emailVerify — not exercised here
      tokenMgmt as any,
    );
  });

  it('should login when identity already exists (return user + token)', async () => {
    const dto = sampleDTO();
    const existingIdentity = { id: 'id-1', userId: 'u1', provider: dto.provider, providerId: dto.providerId } as any;
    const dbUser = { id: 'u1', accountId: 'a1', roles: [{ id: 'r1', name: 'ADMIN' }] } as any;
    const userDTO = { id: 'u1', email: 'alice@example.com', accountId: 'a1', username: 'alice' } as any;

    userIdentityRepo.findByProvider.mockResolvedValue(existingIdentity as any);
    userRepo.findByIdWithRoles.mockResolvedValue(dbUser);
    userMapper.toDTO.mockReturnValue(userDTO);

    const result = await userService.registerWithProvider(dto, 'a1');

    expect(userIdentityRepo.findByProvider).toHaveBeenCalledWith(dto.provider, dto.providerId);
    expect(userRepo.findByIdWithRoles).toHaveBeenCalledWith(existingIdentity.userId);
    expect(tokenService.generateToken).toHaveBeenCalled();
    expect(result).toEqual({ user: userDTO, token: 'fake-token', refreshToken: 'fake-refresh-token' });
    expect(tokenMgmt.issueRefreshToken).toHaveBeenCalledWith('u1');
  });

  it('should link identity when user exists by email (happy path)', async () => {
    const dto = sampleDTO();
    const userByEmail = { id: 'u2', accountId: 'a2', roles: [{ id: 'r2', name: 'USER' }] } as any;
    const userDTO = { id: 'u2', email: 'alice@example.com', accountId: 'a2', username: 'alice' } as any;

    userIdentityRepo.findByProvider.mockResolvedValue(null as any);
    userRepo.findByEmail.mockResolvedValue(userByEmail as any);
    userIdentityRepo.create.mockResolvedValue({ id: 'ui-1', userId: 'u2' } as any);
    userRepo.findByIdWithRoles.mockResolvedValue(userByEmail as any);
    userMapper.toDTO.mockReturnValue(userDTO);

    const result = await userService.registerWithProvider(dto, 'a2');

    expect(userIdentityRepo.findByProvider).toHaveBeenCalledWith(dto.provider, dto.providerId);
    expect(userRepo.findByEmail).toHaveBeenCalledWith(dto.email.trim().toLowerCase());
    expect(userIdentityRepo.create).toHaveBeenCalledWith(userByEmail.id, dto.provider, dto.providerId);
    expect(tokenService.generateToken).toHaveBeenCalled();
    expect(result).toEqual({ user: userDTO, token: 'fake-token', refreshToken: 'fake-refresh-token' });
  });

  it('should handle race when linking identity: create throws unique constraint -> load created identity and login', async () => {
    const dto = sampleDTO();
    const userByEmail = { id: 'u3', accountId: 'a3', roles: [{ id: 'r3', name: 'USER' }] } as any;
    const identityNow = { id: 'ui-2', userId: 'u3', provider: dto.provider, providerId: dto.providerId } as any;

    userIdentityRepo.findByProvider.mockResolvedValue(null as any);
    userRepo.findByEmail.mockResolvedValue(userByEmail as any);

    // Simulate concurrent creation throwing Prisma P2002
    userIdentityRepo.create.mockRejectedValue({ code: 'P2002' });
    // Then the identity becomes available
    userIdentityRepo.findByProvider.mockResolvedValueOnce(null as any).mockResolvedValueOnce(identityNow as any);
    userRepo.findByIdWithRoles.mockResolvedValue(userByEmail as any);
    userMapper.toDTO.mockReturnValue({ id: 'u3', email: 'alice@example.com', accountId: 'a3', username: 'alice' } as any);

    const result = await userService.registerWithProvider(dto, 'a3');

    expect(userIdentityRepo.create).toHaveBeenCalledWith(userByEmail.id, dto.provider, dto.providerId);
    expect(userIdentityRepo.findByProvider).toHaveBeenCalledWith(dto.provider, dto.providerId);
    expect(userRepo.findByIdWithRoles).toHaveBeenCalledWith(identityNow.userId);
    expect(tokenService.generateToken).toHaveBeenCalled();
    expect(result.token).toBe('fake-token');
    expect(tokenMgmt.issueRefreshToken).toHaveBeenCalledTimes(1);
    expect(result.refreshToken).toBe('fake-refresh-token');
  });

  it('should create user + identity when neither exists (transactional create)', async () => {
    const dto = sampleDTO();
    const createdUser = { id: 'u4', accountId: 'a4', roles: [{ id: 'r4', name: 'USER' }] } as any;
    const userDTO = { id: 'u4', email: 'alice@example.com', accountId: 'a4', username: 'alice' } as any;

    userIdentityRepo.findByProvider.mockResolvedValue(null as any);
    userRepo.findByEmail.mockResolvedValue(null as any);
    userRepo.createWithIdentity.mockResolvedValue(createdUser as any);
    userMapper.toDTO.mockReturnValue(userDTO);

    const result = await userService.registerWithProvider(dto, 'a4');

    expect(userRepo.createWithIdentity).toHaveBeenCalled();
    expect(tokenService.generateToken).toHaveBeenCalled();
    expect(result).toEqual({ user: userDTO, token: 'fake-token', refreshToken: 'fake-refresh-token' });
  });

  it('should return undefined refreshToken when TokenManagementService is unavailable', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { UserService: UserServiceClass } = require('@users/services/user.service');
    const mockPrisma = {
      role: { findFirst: jest.fn().mockResolvedValue({ id: 'role-admin', name: 'ACCOUNT_OWNER' }) },
    } as any;
    const serviceWithoutTokenMgmt = new UserServiceClass(
      loggerMock,
      userRepo as any,
      userMapper as any,
      tokenService as any,
      userIdentityRepo as any,
      passwordHasher as any,
      providerVerifier as any,
      accountRepo as any,
      mockPrisma,
    );

    const dto = sampleDTO();
    const existingIdentity = { id: 'id-1', userId: 'u1', provider: dto.provider, providerId: dto.providerId } as any;
    const dbUser = { id: 'u1', accountId: 'a1', roles: [{ id: 'r1', name: 'ADMIN' }] } as any;
    userIdentityRepo.findByProvider.mockResolvedValue(existingIdentity as any);
    userRepo.findByIdWithRoles.mockResolvedValue(dbUser);
    userMapper.toDTO.mockReturnValue({ id: 'u1' } as any);

    const result = await serviceWithoutTokenMgmt.registerWithProvider(dto, 'a1');

    expect(result.refreshToken).toBeUndefined();
    expect(result.token).toBe('fake-token');
  });

  it('should reject linking when provider email is unverified', async () => {
    const dto = sampleDTO();
    const userByEmail = { id: 'u5', accountId: 'a5', roles: [{ id: 'r5', name: 'USER' }] } as any;

    // provider reports email unverified
    providerVerifier.verifyProvider.mockResolvedValue({ providerId: 'prov-1', email: 'alice@example.com', email_verified: false });

    userIdentityRepo.findByProvider.mockResolvedValue(null as any);
    userRepo.findByEmail.mockResolvedValue(userByEmail as any);

    await expect(userService.registerWithProvider(dto, 'a5')).rejects.toThrow(ConflictError);
  });

  it('should use provider claims providerId over provided providerId', async () => {
    const dto = sampleDTO({ providerId: 'dto-prov' });
    const existingIdentity = { id: 'id-claims', userId: 'u6', provider: dto.provider, providerId: 'claims-prov' } as any;
    const dbUser = { id: 'u6', accountId: 'a6', roles: [{ id: 'r6', name: 'USER' }] } as any;

    // provider returns different providerId in claims
    providerVerifier.verifyProvider.mockResolvedValue({ providerId: 'claims-prov', email: 'alice@example.com', email_verified: true });

    userIdentityRepo.findByProvider.mockResolvedValue(existingIdentity as any);
    userRepo.findByIdWithRoles.mockResolvedValue(dbUser as any);
    userMapper.toDTO.mockReturnValue({ id: 'u6', email: 'alice@example.com', accountId: 'a6', username: 'alice' } as any);

    const result = await userService.registerWithProvider(dto, 'a6');

    expect(userIdentityRepo.findByProvider).toHaveBeenCalledWith(dto.provider, 'claims-prov');
    expect(result.token).toBe('fake-token');
  });

  it('should throw AccountNotFoundError when account does not exist', async () => {
    const dto = sampleDTO();

    accountRepo.exists.mockResolvedValueOnce(false);

    await expect(userService.registerWithProvider(dto, 'nonexistent-account')).rejects.toThrow(AccountNotFoundError);
  });
});
