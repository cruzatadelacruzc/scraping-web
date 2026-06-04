import { controller, request, response, httpGet, httpPut } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { NotificationService } from '@alarms/services/notification.service';

@controller('/api/notifications')
export class NotificationController {
  public constructor(@inject(TYPES.NotificationService) private readonly _notificationService: NotificationService) {}

  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    const notifications = await this._notificationService.list();
    ResponseHandler.ok(res, { notifications });
  }

  @httpPut('/:id/read', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async markAsRead(@request() req: Request, @response() res: Response): Promise<void> {
    await this._notificationService.markAsRead(req.params.id);
    ResponseHandler.updated(res);
  }
}
