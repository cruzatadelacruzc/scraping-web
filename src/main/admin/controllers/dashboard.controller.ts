import { Request, Response } from 'express';
import { controller, httpGet, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { DashboardService } from '@admin/services/dashboard.service';

/**
 * SUPER_ADMIN-only controller for the admin dashboard.
 * Exposes platform-wide metrics and backend health checks.
 */
@controller('/api/admin/dashboard')
export class DashboardController {
  public constructor(
    @inject(TYPES.DashboardService) private readonly _service: DashboardService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = DashboardController.name;
  }

  /**
   * Returns aggregated platform-wide metrics (products, accounts, users, subscriptions).
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getMetrics(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const metrics = await this._service.getMetrics();
      ResponseHandler.ok(res, metrics);
    } catch (err) {
      this._log.error('Failed to get dashboard metrics', { error: err });
      ResponseHandler.error(res, 'Failed to get dashboard metrics', 500);
    }
  }

  /**
   * Returns health status of all backend services (MongoDB, PostgreSQL, Redis).
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/health', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getHealth(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const health = await this._service.getHealth();
      ResponseHandler.ok(res, health);
    } catch (err) {
      this._log.error('Failed to get health status', { error: err });
      ResponseHandler.error(res, 'Failed to get health status', 500);
    }
  }
}
