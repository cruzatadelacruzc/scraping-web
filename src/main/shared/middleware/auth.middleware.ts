import { BaseMiddleware } from 'inversify-express-utils';
import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { Request, Response, NextFunction } from 'express';
import { ILogger } from '@shared/logger.interfaces';
import { ResponseHandler } from '@shared/response-handler';
import { getRequestContext, runWithRequestContext } from '@shared/tenant-context-als';
import prisma from '@users/custom-prisma-client';
import { TokenService } from '@shared/security/token.service';

/**
 * Unified AuthMiddleware — handles both authentication and authorization.
 *
 * Authentication (token validation + user lookup):
 *   tenantInitMiddleware -> AuthMiddleware -> Controller -> Service -> Repository
 *
 * Authorization (role check) is integrated via the forRoles() factory,
 * so a single middleware pass validates the token AND checks roles.
 *
 * Usage:
 *   @httpGet('/me', TYPES.AuthMiddleware)              // auth only
 *   @httpGet('/admin', AuthMiddleware.forRoles('ACCOUNT_OWNER'))  // auth + role
 *   @httpGet('/dashboard', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
 */
@injectable()
export class AuthMiddleware extends BaseMiddleware {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.TokenService) private readonly _tokenService: TokenService,
  ) {
    super();
    this._log.context = AuthMiddleware.name;
  }

  /**
   * Authenticate the request. Validates Bearer token, looks up user in DB,
   * populates ALS with tenantId/userId, and attaches user data to req.user.
   */
  public async handler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        ResponseHandler.unAuthenticated(res);
        return;
      }

      const token = authHeader.slice(7);
      const payload = await this._tokenService.verifyToken(token);
      const tenantId = payload?.tenantId || req.header('x-tenant-id');
      const userId = payload?.userId;

      if (!tenantId || !userId) {
        this._log.warn('Invalid token: missing tenantId or userId');
        ResponseHandler.unAuthenticated(res);
        return;
      }

      const verifyInStore = async (): Promise<boolean> => {
        const store = getRequestContext();
        if (!store) {
          throw new Error('Request context not initialized');
        }
        store.tenantId = tenantId;
        store.userId = userId;

        const found = await prisma.user.findFirst({
          where: {
            id: userId,
            accountId: tenantId,
            userIdentity:
              payload.provider && payload.provider !== 'local'
                ? {
                    some: {
                      provider: payload.provider,
                      providerId: payload.providerId,
                    },
                  }
                : undefined,
          },
          include: {
            userIdentity: true,
            roles: true,
          },
        });

        if (!found) {
          this._log.warn(`Token validation failed: user=${userId} tenant=${tenantId}`);
          ResponseHandler.unAuthorized(res);
          return false;
        }

        // Attach user data to request — single source of truth for downstream code
        req.user = {
          ...payload,
          user: found,
          // Normalize roles to string[] from DB for consistent role checking
          roles: (found.roles || []).map(r => r.name),
        };

        return true;
      };

      const existingStore = getRequestContext();
      if (existingStore) {
        const ok = await verifyInStore();
        if (!ok) return;
        next();
        return;
      }

      await runWithRequestContext({ tenantId, userId }, async (): Promise<void> => {
        const ok = await verifyInStore();
        if (!ok) return;
        next();
      });
    } catch (err) {
      let message = 'Invalid or expired token';
      if (err instanceof Error) message = `${message}. ${err.message}`;
      this._log.error(message);
      ResponseHandler.unAuthenticated(res, false, message);
    }
  }

  /**
   * Factory: returns a middleware function that authenticates AND checks roles.
   *
   * The returned function first delegates to the full auth flow (token + user lookup),
   * then verifies the user has at least one of the required roles.
   *
   * Usage in controllers:
   *   @httpGet('/admin', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
   *   @httpGet('/shared', AuthMiddleware.forRoles('ACCOUNT_OWNER', 'MEMBER'))
   */
  public static forRoles(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      // Lazy require to break circular dependency with container.ts
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { container }: { container: import('inversify').Container } = require('../container');
      const instance = container.get<AuthMiddleware>(TYPES.AuthMiddleware);

      await instance.handler(req, res, () => {
        // Auth passed — now check roles from req.user
        const user = req.user as any;
        const userRoles: string[] = user?.roles || [];

        if (!userRoles.length) {
          ResponseHandler.unAuthorized(res);
          return;
        }

        const hasRole = roles.some(role => userRoles.includes(role));
        if (!hasRole) {
          ResponseHandler.unAuthorized(res);
          return;
        }

        next();
      });
    };
  }
}
