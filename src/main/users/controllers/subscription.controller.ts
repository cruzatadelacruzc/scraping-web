import { controller, httpPost, httpGet, httpDelete, request, response } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { SubscriptionsService } from '../services/account-subscriptions.service';

@controller('/api')
export class SubscriptionController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.SubscriptionsService) private readonly _subscriptionsService: SubscriptionsService,
  ) {
    this._log.context = SubscriptionController.name;
  }

  @httpPost('/subscriptions', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    const { accountId, planId, status } = req.body;

    if (!accountId || typeof accountId !== 'string') {
      return ResponseHandler.badRequest(res, 'accountId (uuid) is required');
    }
    if (!planId || typeof planId !== 'string') {
      return ResponseHandler.badRequest(res, 'planId (uuid) is required');
    }

    this._log.debug('REST request to create subscription', { accountId, planId, status });
    const subscription = await this._subscriptionsService.create(accountId, planId, status);
    ResponseHandler.created(res, 'http:created', { subscription });
  }

  @httpGet('/accounts/:accountId/subscriptions', TYPES.AuthMiddleware)
  public async listByAccount(@request() req: Request, @response() res: Response): Promise<void> {
    this._log.debug('REST request to list subscriptions for account', { accountId: req.params.accountId });
    const subscriptions = await this._subscriptionsService.getByAccountId(req.params.accountId);
    ResponseHandler.ok(res, { subscriptions });
  }

  @httpDelete('/subscriptions/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async cancel(@request() req: Request, @response() res: Response): Promise<void> {
    this._log.debug('REST request to cancel subscription', { id: req.params.id });
    const subscription = await this._subscriptionsService.cancel(req.params.id);
    ResponseHandler.ok(res, { subscription });
  }
}
