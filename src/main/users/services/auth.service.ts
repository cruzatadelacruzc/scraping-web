import { injectable, inject } from 'inversify';
import { UserLoginDTO } from '../dto/user-login.dto';
import { AuthResponseDTO } from '../dto/auth-response.dto';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { PasswordHasher } from '@shared/security/password-hasher.serice';
import { UserRepository } from '@users/repositories';
import { TokenService } from '@shared/security/token.service';
import { RoleType } from '@users/dto';
import { User } from '@prisma/client';
import { UserMapper } from '@users/mappers';

@injectable()
export class AuthService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(UserRepository) private userRepository: UserRepository,
    @inject(TYPES.UserMapper) private userMapper: UserMapper,
    @inject(TYPES.PasswordHasher) private readonly _hasher: PasswordHasher,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
  ) {
    this._log.context = AuthService.name;
  }

  /**
   * Authenticates a user and returns token with user data
   * @param {UserLoginDTO} data Login credentials
   * @returns {Promise<AuthResponseDTO>} User data with authentication token
   * @throws {Error} If credentials are invalid or user not found
   */
  public async login(data: UserLoginDTO): Promise<AuthResponseDTO> {
    this._log.debug('Login attempt for user:', data.username);

    const user = await this.findUserByCredentials(data.username);
    if (!user) {
      this._log.warn('Login failed: User not found');
      throw new Error('Invalid credentials');
    }

    if (!user.passwordHash) {
      this._log.warn('Login failed: no password set for user');
      throw new Error('Invalid credentials');
    }

    const isValidPassword = await this._hasher.compare(data.password, user.passwordHash);
    if (!isValidPassword) {
      this._log.warn('Login failed: Invalid password');
      throw new Error('Invalid credentials');
    }

    const userDTO = this.userMapper.toDTO(user);
    if (!userDTO) {
      throw new Error('Error mapping user data');
    }

    const token = this._tokenService.generateToken(
      user.id,
      user.accountId,
      (user.roles || []).map(r => r.name),
    );
    return { user: userDTO, token };
  }

  private async findUserByCredentials(username: string): Promise<(User & { roles: RoleType[] }) | null> {
    const isEmail = username.includes('@');
    return isEmail ? this.userRepository.findByEmail(username) : this.userRepository.findByUsername(username);
  }
}
