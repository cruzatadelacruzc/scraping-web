import { Request, Response } from 'express';
import { controller, httpGet, httpDelete, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { UserService } from '@users/services/user.service';

@controller('/api/admin/users')
export class AdminController {
  public constructor(
    @inject(TYPES.UserService) private readonly _userService: UserService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = 'AdminController';
  }

  /**
   * Lists all users across all tenants.
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    const users = await this._userService.getAll();
    ResponseHandler.ok(res, { users });
  }

  /**
   * Deletes a user by ID.
   * @param req - Express request with user id in params.
   * @param res - Express response.
   */
  @httpDelete('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._userService.delete(req.params.id);
      ResponseHandler.deleted(res);
    } catch {
      ResponseHandler.notFound(res);
    }
  }
}
