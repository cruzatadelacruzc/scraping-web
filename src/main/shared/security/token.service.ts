import { injectable } from 'inversify';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ILogger } from '@shared/logger.interface';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';

export interface ITokenPayload {
  userId: string;
  tenantId: string;
  roles?: string[];
  provider?: string;
  providerId?: string;
  jti?: string;
  exp?: number;
}

@injectable()
export class TokenService {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = TokenService.name;
  }

  /**
   * Generates a JWT token for a user
   * @param {UserId} userId - The Id user to generate token for
   * @param {string} accountId - The account (tenant) ID
   * @param {string[]} [roles] - Optional roles to include in the token
   * @param {string} [provider] - Optional provider name for social login
   * @param {string} [providerId] - Optional provider user ID for social login
   * @returns {string} The generated JWT token
   */
  public generateToken(userId: string, accountId: string, roles?: string[], provider?: string, providerId?: string): string {
    this._log.debug(`Generating token for user ${userId}`);
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiration = process.env.JWT_EXPIRATION || '1d';
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    const payload: ITokenPayload = {
      userId,
      tenantId: accountId,
      roles,
      provider,
      providerId,
      jti: crypto.randomUUID(),
    };
    return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
  }

  /**
   * Verifies a JWT token
   * @param {string} token - The token to verify
   * @returns {Promise<ITokenPayload>} The decoded token payload
   */
  public async verifyToken(token: string): Promise<ITokenPayload> {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    return jwt.verify(token, jwtSecret) as ITokenPayload;
  }
}
