import { ILogger } from '@shared/logger.interface';
import { TokenService } from '@shared/security/token.service';
import { TYPES } from '@shared/types.container';
import { ProviderRegistrationDTO } from '@users/dto/provider-registration.dto';
import { ConflictError } from '@users/errors/conflict.error';
import { UserNotFoundError } from '@users/errors/user-not-found.error';
import { UserMapper } from '@users/mappers';
import { isPrismaUniqueConstraintError } from '@users/custom-prisma-client';
import { UserRepository } from '@users/repositories';
import { UserIdentityRepository } from '@users/repositories/user-identity.repository';
import { inject, injectable } from 'inversify';
import { PasswordHasher } from '@shared/security/password-hasher.serice';
import { UserDTO, UserRegisterDTO } from '@users/dto';
import { AuthResponseDTO } from '@users/dto/auth-response.dto';
import { ProviderTokenVerifier } from '@shared/security/provider-token-verifier';
import { AccountRepository } from '@users/repositories/account.repository';
import { AccountNotFoundError } from '@users/errors/account-not-found.error';
import { PrismaClient } from '@prisma/client';
import { EmailVerificationService } from './email-verification.service';
import { TokenManagementService } from './token-management.service';

@injectable()
export class UserService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(UserRepository) private readonly _userRepository: UserRepository,
    @inject(TYPES.UserMapper) private readonly _userMapper: UserMapper,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
    @inject(UserIdentityRepository) private readonly _userIdentityRepository: UserIdentityRepository,
    @inject(TYPES.PasswordHasher) private readonly _hasher: PasswordHasher,
    @inject(TYPES.ProviderTokenVerifier) private readonly _providerVerifier: ProviderTokenVerifier,
    @inject(AccountRepository) private readonly _accountRepository: AccountRepository,
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.EmailVerificationService) private readonly _emailVerify?: EmailVerificationService,
    @inject(TYPES.TokenManagementService) private readonly _tokenMgmt?: TokenManagementService,
  ) {
    this._log.context = UserService.name;
  }

  /**
   * Resolves role IDs for new user creation. If explicit roleIds are provided, they are used as-is.
   * Otherwise, the default ACCOUNT_OWNER global role is looked up and assigned.
   */
  private async resolveRoleIds(roleIds?: string[]): Promise<string[]> {
    if (roleIds && roleIds.length > 0) return roleIds;

    const defaultRole = await this._prisma.role.findFirst({
      where: { name: 'ACCOUNT_OWNER', accountId: null },
    });

    return defaultRole ? [defaultRole.id] : [];
  }

  /**
   * Registers or authenticates a user using a third-party provider (OAuth/Social Login).
   *
   * The method follows these steps:
   * 1. Verifies the provider token and extracts user claims
   * 2. Checks if user already exists by provider identity
   * 3. If not found by identity, attempts to link to existing user by email (if email is verified)
   * 4. If no existing user, creates new user with provider identity
   *
   * @param data - Provider registration data containing tokens and user information
   * @returns Promise resolving to authenticated user data and access token
   * @throws {UserNotFoundError} If linked user cannot be found
   * @throws {ConflictError} If provider email is unverified when linking to existing account
   * @throws {ConflictError} If concurrent creation leads to unique constraint violation
   *
   * @example
   * const authResponse = await userService.registerWithProvider({
   *   provider: 'google',
   *   idToken: 'google-id-token',
   *   accessToken: 'google-access-token',
   *   email: 'user@example.com',
   *   username: 'username'
   * });
   */
  public async registerWithProvider(data: ProviderRegistrationDTO, accountId: string): Promise<AuthResponseDTO> {
    // Normalize input
    const incomingEmail = data.email?.trim().toLowerCase();
    const username = data.username.trim();

    // 0) Verify provider token and obtain canonical claims (providerId, email, email_verified, name, picture)
    const claims = await this._providerVerifier.verifyProvider(data.provider, { idToken: data.idToken, accessToken: data.accessToken });
    const providerId = claims.providerId || data.providerId;
    const email = (claims.email || incomingEmail || '').trim().toLowerCase();
    const emailVerified = !!claims.email_verified;
    const displayName = claims.name || data.displayName;
    const avatarUrl = claims.picture || data.avatarUrl;

    this._log.debug('RegisterWithProvider request', { provider: data.provider, providerId, email: incomingEmail });

    const accountExists = await this._accountRepository.exists(accountId);
    if (!accountExists) {
      throw new AccountNotFoundError(`Account with id ${accountId} not found`);
    }

    // 1) Check identity by provider/providerId (canonical)
    const existingIdentity = await this._userIdentityRepository.findByProvider(data.provider, providerId);
    if (existingIdentity) {
      const user = await this._userRepository.findByIdWithRoles(existingIdentity.userId);
      if (!user) throw new UserNotFoundError('Linked user not found');
      const token = this._tokenService.generateToken(
        user.id,
        user.accountId,
        (user.roles || []).map(r => r.name),
        data.provider,
        providerId,
      );
      return { user: this._userMapper.toDTO(user)!, token };
    }

    // 2) Try to find user by email (link identity if exists)
    const userByEmail = email ? await this._userRepository.findByEmail(email) : null;
    if (userByEmail) {
      // If provider reports email not verified, do NOT auto-link — require confirmation/flow
      if (!emailVerified) {
        // Do not auto-link unverified provider email to existing account
        throw new ConflictError('Provider email is not verified; linking requires user confirmation');
      }

      // Attempt to create identity linking that user (handle race/unique)
      try {
        await this._userIdentityRepository.create(userByEmail.id, data.provider, providerId);
      } catch (err: any) {
        if (isPrismaUniqueConstraintError(err)) {
          // someone else created the identity concurrently - load it and continue as login
          const identityNow = await this._userIdentityRepository.findByProvider(data.provider, providerId);
          if (identityNow) {
            const user = await this._userRepository.findByIdWithRoles(identityNow.userId);
            if (!user) throw new UserNotFoundError('Linked user not found');
            const token = this._tokenService.generateToken(
              user.id,
              user.accountId,
              (user.roles || []).map(r => r.name),
              data.provider,
              providerId,
            );
            return { user: this._userMapper.toDTO(user)!, token };
          }
        }
        throw err;
      }

      // Linked successfully: update profile fields only if empty
      const shouldUpdateDisplayName = !userByEmail.displayName && displayName;
      const shouldUpdateAvatar = !userByEmail.avatarUrl && avatarUrl;
      if (shouldUpdateDisplayName || shouldUpdateAvatar) {
        await this._userRepository.update(userByEmail.id, {
          ...(shouldUpdateDisplayName ? { displayName } : {}),
          ...(shouldUpdateAvatar ? { avatarUrl } : {}),
        });
      }

      const user = await this._userRepository.findByIdWithRoles(userByEmail.id);
      if (!user) throw new UserNotFoundError('Linked user not found');
      const token = this._tokenService.generateToken(
        user.id,
        user.accountId,
        (user.roles || []).map(r => r.name),
        data.provider,
        providerId,
      );
      return { user: this._userMapper.toDTO(user)!, token };
    }

    // 3) No user by email -> create user + identity atomically
    const roleIds = await this.resolveRoleIds();
    const createInput = this._userMapper.toCreateInput({
      email,
      username,
      passwordHash: null as any,
      displayName,
      avatarUrl,
      emailVerified,
      accountId,
      roleIds,
    });

    try {
      const createdUser = await this._userRepository.createWithIdentity(createInput, data.provider, providerId);

      if (!createdUser) {
        this._log.error('Inconsistent state: user created but not returned', { createInput, providerData: data, claims });
        throw new UserNotFoundError('Linked user not found');
      }

      // Optionally persist profile fields (displayName, picture) if your mapper/repo supports it.
      const userDTO = this._userMapper.toDTO(createdUser)!;
      const token = this._tokenService.generateToken(
        createdUser.id,
        createdUser.accountId,
        (createdUser.roles || []).map(r => r.name),
        data.provider,
        providerId,
      );

      return { user: userDTO, token };
    } catch (err: any) {
      if (isPrismaUniqueConstraintError(err)) {
        // Could be username/email concurrently created. Translate to Conflict for controller.
        throw new ConflictError('Resource already exists');
      }
      throw err;
    }
  }

  /**
   * Registers a new user with local authentication (email/password).
   *
   * The method follows these steps:
   * 1. Verifies account exists
   * 2. Validates email and username are unique
   * 3. Hashes the password
   * 4. Creates the user with local credentials
   * 5. Returns user DTO and authentication token
   *
   * @param dto - The user registration data transfer object containing user details
   * @param dto.email - User's email address (normalized to lowercase)
   * @param dto.username - User's username (normalized to lowercase)
   * @param dto.password - User's password (must meet complexity requirements)
   * @param dto.displayName - User's display name (optional)
   * @param dto.avatarUrl - URL to user's avatar image (optional)
   * @param accountId - The ID of the account to associate the user with
   *
   * @returns Promise<AuthResponseDTO> containing the created user DTO and authentication token
   *
   * @throws {AccountNotFoundError} When the specified account doesn't exist
   * @throws {ConflictError} When email or username is already registered
   * @throws {UserNotFoundError} When user creation succeeds but retrieval fails
   */
  public async registerLocal(dto: UserRegisterDTO, accountId: string): Promise<AuthResponseDTO> {
    // Note: email and username are already normalized (lowercase) by Zod schema
    const email = dto.email;
    const username = dto.username;

    this._log.debug('RegisterLocal request', { email, username, accountId });

    // Verify account exists
    const accountExists = await this._accountRepository.exists(accountId);
    if (!accountExists) {
      this._log.warn('RegisterLocal failed: account not found', { accountId });
      throw new AccountNotFoundError(`Account with id ${accountId} not found`);
    }

    // Check for duplicate email
    const existingByEmail = await this._userRepository.findByEmail(email);
    if (existingByEmail) {
      this._log.warn('RegisterLocal failed: email already registered', { email });
      throw new ConflictError('Email already registered');
    }

    // Check for duplicate username (important for provider linking compatibility)
    const existingByUsername = await this._userRepository.findByUsername(username);
    if (existingByUsername) {
      this._log.warn('RegisterLocal failed: username already taken', { username });
      throw new ConflictError('Username already taken');
    }

    // Hash password
    const passwordHash = await this._hasher.hash(dto.password);

    // Resolve roles: use provided roleIds or default to ACCOUNT_OWNER
    const roleIds = await this.resolveRoleIds(dto.roleIds);

    // Build create input via mapper (mapper should only set passwordHash when provided)
    const createInput = this._userMapper.toCreateInput({
      email,
      username,
      passwordHash,
      displayName: dto.displayName,
      avatarUrl: dto.avatarUrl,
      emailVerified: false,
      accountId,
      roleIds,
    });

    // Persist user
    try {
      const createdUser = await this._userRepository.create(createInput);

      if (!createdUser) {
        this._log.error('Inconsistent state: user created but not returned', { createInput });
        throw new UserNotFoundError('Created user not found');
      }

      this._log.debug('User registered successfully', { userId: createdUser.id, email });

      const token = this._tokenService.generateToken(
        createdUser.id,
        createdUser.accountId,
        (createdUser.roles || []).map((r: any) => r.name),
      );

      // Issue refresh token
      let refreshToken: string | undefined;
      if (this._tokenMgmt) {
        refreshToken = await this._tokenMgmt.issueRefreshToken(createdUser.id);
      }

      // Enqueue email verification
      if (this._emailVerify) {
        try {
          await this._emailVerify.requestVerification(createdUser.id, createdUser.email);
        } catch {
          this._log.warn('Failed to enqueue verification email', { userId: createdUser.id });
        }
      }

      return { user: this._userMapper.toDTO(createdUser)!, token, refreshToken };
    } catch (err: any) {
      if (isPrismaUniqueConstraintError(err)) {
        // Handle race condition: email/username created concurrently
        this._log.warn('RegisterLocal failed: concurrent creation conflict', { email, username, error: err.message });
        throw new ConflictError('Email or username already registered');
      }
      throw err;
    }
  }

  /**
   * Return all users for the current tenant.
   */
  public async getAll(): Promise<UserDTO[]> {
    this._log.debug('Request to list all users');
    const users = await this._userRepository.findAll();
    return this._userMapper.toDTOs(users);
  }

  /**
   * Return single user by id (or null if not found).
   */
  public async getById(id: string): Promise<UserDTO | null> {
    this._log.debug('Request to get user by id', { id });
    const user = await this._userRepository.findByIdWithRoles(id);
    return this._userMapper.toDTO(user);
  }

  /**
   * Update a user. `data` is a partial payload (validated earlier by middleware).
   * Throws UserNotFoundError if the user does not exist.
   */
  public async update(id: string, data: Partial<Record<string, any>>): Promise<UserDTO> {
    this._log.debug('Request to update user', { id, data });

    const existing = await this._userRepository.findByIdWithRoles(id);
    if (!existing) {
      this._log.warn('Update failed: user not found', { id });
      throw new UserNotFoundError(`User with id ${id} not found`);
    }

    const updateInput = this._userMapper.toUpdateInput(data as any);

    const updated = await this._userRepository.update(id, updateInput as any);
    return this._userMapper.toDTO(updated)!;
  }

  /**
   * Delete a user by id.
   * @param id - User id to delete
   */
  public async delete(id: string): Promise<void> {
    this._log.debug('Request to delete user', { id });
    const existing = await this._userRepository.findById(id);
    if (!existing) {
      this._log.warn('Delete failed: user not found', { id });
      throw new UserNotFoundError(`User with id ${id} not found`);
    }
    await this._userRepository.delete(id);
  }

  /**
   * Initiates an email change for an authenticated user.
   * Verifies the current password, checks the new email is available,
   * and sends a verification email to the new address.
   *
   * @param userId    - The authenticated user's ID.
   * @param newEmail  - The desired new email address.
   * @param password  - The user's current password for re-authentication.
   * @throws {Error} If the password is wrong or the email is already taken.
   */
  public async requestEmailChange(userId: string, newEmail: string, password: string): Promise<void> {
    const user = await this._userRepository.findById(userId);
    if (!user) {
      throw new UserNotFoundError(`User with id ${userId} not found`);
    }

    if (!user.passwordHash) {
      throw new Error('Cannot change email for accounts without a password');
    }

    const valid = await this._hasher.compare(password, user.passwordHash);
    if (!valid) {
      throw new Error('Password is incorrect');
    }

    const normalizedEmail = newEmail.toLowerCase().trim();
    const existingByEmail = await this._userRepository.findByEmail(normalizedEmail);
    if (existingByEmail && existingByEmail.id !== userId) {
      throw new ConflictError('Email is already in use');
    }

    if (this._emailVerify) {
      await this._emailVerify.requestVerification(userId, normalizedEmail);
    }

    this._log.info('Email change requested', { userId, newEmail: normalizedEmail });
  }

  /**
   * Links an OAuth provider identity to an authenticated user.
   *
   * @param userId      - The authenticated user's ID.
   * @param provider    - The provider name (google | facebook).
   * @param providerId  - The provider's user ID.
   * @param idToken     - Optional ID token for verification.
   * @param accessToken - Optional access token.
   * @throws {ConflictError} If the provider identity is already linked to another user.
   */
  public async linkProvider(userId: string, provider: string, providerId: string, idToken?: string, accessToken?: string): Promise<void> {
    // Verify provider token if provided
    if (idToken) {
      const claims = await this._providerVerifier.verifyProvider(provider as any, { idToken, accessToken });
      providerId = claims.providerId || providerId;
    }

    // Check if identity is already linked
    const existing = await this._userIdentityRepository.findByProvider(provider, providerId);
    if (existing) {
      if (existing.userId === userId) {
        // Already linked to this user — no-op
        return;
      }
      throw new ConflictError('This provider account is already linked to another user');
    }

    await this._userIdentityRepository.create(userId, provider, providerId);
    this._log.info('Provider linked', { userId, provider, providerId });
  }

  /**
   * Unlinks an OAuth provider identity from an authenticated user.
   * The user must have either a password set or another provider identity
   * to avoid being locked out.
   *
   * @param userId   - The authenticated user's ID.
   * @param provider - The provider name to unlink.
   * @throws {Error} If this is the last authentication method.
   */
  public async unlinkProvider(userId: string, provider: string): Promise<void> {
    const user = await this._userRepository.findByIdWithRoles(userId);
    if (!user) {
      throw new UserNotFoundError(`User with id ${userId} not found`);
    }

    // Fetch identities separately (UserWithRoles doesn't include userIdentity)
    // Check user has another way to log in
    // We need to count all identities for this user — use a Prisma query
    const allIdentities = await this._prisma.userIdentity.findMany({
      where: { userId },
    });

    const otherIdentities = allIdentities.filter(i => i.provider !== provider);

    if (otherIdentities.length === 0 && !user.passwordHash) {
      throw new Error('Cannot unlink the last authentication method. Set a password first.');
    }

    // Find the specific identity to delete
    const targetIdentity = allIdentities.find(i => i.provider === provider);
    if (targetIdentity) {
      await this._userIdentityRepository.delete(targetIdentity.id);
      this._log.info('Provider unlinked', { userId, provider });
    }
  }
}
