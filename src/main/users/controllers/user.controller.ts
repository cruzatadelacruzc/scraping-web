import { controller, request, response, httpPut, httpGet, httpDelete } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { UserService } from '../services/user.service';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';

@controller('/api/users')
export class UserController {
  public constructor(@inject(TYPES.UserService) private readonly userService: UserService) {}

  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    const users = await this.userService.getAll();
    ResponseHandler.ok(res, { users });
  }

  @httpGet('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async get(@request() req: Request, @response() res: Response): Promise<void> {
    const user = await this.userService.getById(req.params.id);
    ResponseHandler.wrapOrNotFound(res, user);
  }

  @httpPut('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async update(@request() req: Request, @response() res: Response): Promise<void> {
    const user = await this.userService.update(req.params.id, req.body);
    ResponseHandler.updated(res, { user });
  }

  @httpDelete('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    await this.userService.delete(req.params.id);
    ResponseHandler.deleted(res);
  }
}
