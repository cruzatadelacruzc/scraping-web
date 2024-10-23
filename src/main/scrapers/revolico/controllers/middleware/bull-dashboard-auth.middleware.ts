import { BaseMiddleware } from '@shared/base-middleware';
import { ResponseHandler } from '@shared/response-handler';
import { Request, Response, NextFunction } from 'express';

export class QueueDashboardAuthMiddleware extends BaseMiddleware {
  public constructor() {
    super();
  }

  public execute(req: Request, res: Response, next: NextFunction): void {
    const auth = { login: process.env.BULL_BOARD_USER, password: process.env.BULL_BOARD_PASSWORD };
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';

    if (!b64auth) {
      return ResponseHandler.unAuthenticated(res, true);
    }

    const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');

    if (login && password && login === auth.login && password === auth.password) {
      return next();
    }

    ResponseHandler.unAuthenticated(res, true);
  }

  /**
   * @static
   * @description Creates a middleware function for Basic Authentication.
   * This method instantiates the BullBoardAuthMiddleware and calls its execute method.
   */
  public static authenticate(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const middleware = new QueueDashboardAuthMiddleware();
      middleware.execute(req, res, next);
    };
  }
}
