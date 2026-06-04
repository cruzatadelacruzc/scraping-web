import { controller, httpGet, httpDelete, request, response } from 'inversify-express-utils';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { inject } from 'inversify';
import { UserService } from '@users/services/user.service';

@controller('/api/admin/users')
export class AdminController {
  public constructor(@inject('UserService') private userService: UserService) {}

  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() req: any, @response() res: any): Promise<void> {
    const users = await this.userService.getAll();
    res.status(200).json({ users });
  }

  @httpDelete('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async delete(@request() req: any, @response() res: any): Promise<void> {
    await this.userService.delete(req.params.id);
    res.status(204).send();
  }
}
