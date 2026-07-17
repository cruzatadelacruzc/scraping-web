import { injectable, inject } from 'inversify';
import type Redis from 'ioredis';
import { UserLoginDTO } from '../dto/user-login.dto';
import { AuthResponseDTO } from '../dto/auth-response.dto';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { PasswordHasher } from '@shared/security/password-hasher.serice';
import { UserRepository } from '@users/repositories';
import { TokenService } from '@shared/security/token.service';
import { RoleType } from '@users/dto';
import { User } from '@prisma/client';
import { UserMapper } from '@users/mappers';
import { LoginRateLimitService } from './login-rate-limit.service';
import { TokenManagementService } from './token-management.service';
import { LoginAttemptRepository } from '@users/repositories/login-attempt.repository';
import { InvalidCredentialsError } from '@users/errors/invalid-credentials.error';
import { RateLimitError } from '@users/errors/rate-limit.error';
import { AccountDeactivatedError } from '@users/errors/account-deactivated.error';

@injectable()
export class AuthService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,

    @inject(UserRepository) private userRepository: UserRepository,
    @inject(TYPES.UserMapper) private userMapper: UserMapper,
    @inject(TYPES.PasswordHasher) private readonly _hasher: PasswordHasher,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
    @inject(TYPES.LoginRateLimitService) private readonly _rateLimiter: LoginRateLimitService,
    @inject(TYPES.TokenManagementService) private readonly _tokenMgmt: TokenManagementService,
    @inject(TYPES.LoginAttemptRepository) private readonly _loginAttemptRepo: LoginAttemptRepository,
    @inject(TYPES.RedisClient) private readonly _redis?: Redis,
  ) {
    this._log.context = AuthService.name;
  }

  /**
   * Authenticates a user and returns both an access token and a refresh token.
   *
   * Rate-limited per IP and per username/email. Deactivated accounts are rejected.
   *
   * @param data   - Login credentials (username can be email or username).
   * @param ip     - The request IP for rate limiting.
   * @param userAgent - The request user agent for audit logging.
   * @returns Token response with user data.
   * @throws {InvalidCredentialsError} If the username does not exist, no password is set, or the password is wrong.
   * @throws {AccountDeactivatedError} If the account has been soft-deleted.
   * @throws {RateLimitError} If the IP or username has exceeded the rate limit.
   */
  public async login(data: UserLoginDTO, ip?: string, userAgent?: string): Promise<AuthResponseDTO> {
    this._log.debug('Login attempt for user:', data.username);

    // Rate limiting — check IP and username before any password validation
    if (ip) {
      const ipLimit = await this._rateLimiter.checkByIp(ip);
      if (!ipLimit.allowed) {
        this._log.warn('Login blocked by IP rate limit', { ip, username: data.username });
        throw new RateLimitError(ipLimit.retryAfterMs);
      }
    }

    const userLimit = await this._rateLimiter.checkByUsername(data.username);
    if (!userLimit.allowed) {
      this._log.warn('Login blocked by username rate limit', { username: data.username });
      throw new RateLimitError(userLimit.retryAfterMs);
    }

    const user = await this.findUserByCredentials(data.username);
    if (!user) {
      await this._loginAttemptRepo.create({ ipAddress: ip, userAgent, success: false });
      this._log.warn('Login failed: User not found');
      throw new InvalidCredentialsError();
    }

    // Reject deactivated accounts
    if (user.deletedAt) {
      this._log.warn('Login rejected: account deactivated', { userId: user.id });
      throw new AccountDeactivatedError();
    }

    if (!user.passwordHash) {
      await this._loginAttemptRepo.create({ userId: user.id, ipAddress: ip, userAgent, success: false });
      this._log.warn('Login failed: no password set for user');
      throw new InvalidCredentialsError();
    }

    const isValidPassword = await this._hasher.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      await this._loginAttemptRepo.create({ userId: user.id, ipAddress: ip, userAgent, success: false });
      this._log.warn('Login failed: Invalid password');
      throw new InvalidCredentialsError();
    }

    // Successful login — reset rate limit counters
    if (ip) {
      await this._rateLimiter.recordSuccessfulLogin(ip, data.username);
    }

    await this._loginAttemptRepo.create({ userId: user.id, ipAddress: ip, userAgent, success: true });

    const userDTO = this.userMapper.toDTO(user);
    if (!userDTO) {
      throw new Error('Error mapping user data');
    }

    const token = this._tokenService.generateToken(
      user.id,
      user.accountId,
      (user.roles || []).map(r => r.name),
    );

    // Issue refresh token
    const refreshToken = await this._tokenMgmt.issueRefreshToken(user.id);

    return { user: userDTO, token, refreshToken };
  }

  /**
   * Logs out a user by blacklisting the current JWT and optionally revoking a
   * refresh token.
   *
   * @param jti          - The JWT ID from the current access token.
   * @param exp          - The expiration timestamp of the current JWT (seconds since epoch).
   * @param refreshToken - Optional raw refresh token to revoke.
   */
  public async logout(jti: string, exp: number, refreshToken?: string): Promise<void> {
    // Blacklist the JWT in Redis with TTL matching remaining token lifetime
    if (this._redis && jti) {
      try {
        const now = Math.floor(Date.now() / 1000);
        const ttl = Math.max(1, exp - now);
        await this._redis.setex(`jwt:blacklist:${jti}`, ttl, '1');
        this._log.info('JWT blacklisted', { jti, ttl });
      } catch (err: unknown) {
        this._log.warn('Failed to blacklist JWT', { error: String(err), jti });
      }
    }

    // Revoke refresh token if provided
    if (refreshToken) {
      try {
        await this._tokenMgmt.revokeRefreshToken(refreshToken);
      } catch (err: unknown) {
        this._log.warn('Failed to revoke refresh token', { error: String(err) });
      }
    }
  }

  private async findUserByCredentials(username: string): Promise<(User & { roles: RoleType[] }) | null> {
    const isEmail = username.includes('@');
    return isEmail ? this.userRepository.findByEmail(username) : this.userRepository.findByUsername(username);
  }
}
