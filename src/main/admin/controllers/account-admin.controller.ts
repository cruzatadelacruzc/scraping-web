import { Request, Response } from 'express';
import { controller, httpGet, httpPut, httpDelete, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { AccountAdminService } from '@admin/services/account-admin.service';

@controller('/api/admin/accounts')
export class AccountAdminController {
  public constructor(
    @inject(TYPES.AccountAdminService) private readonly _service: AccountAdminService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = AccountAdminController.name;
  }

  /**
   * Lists all accounts with pagination and related counts.
   * @param req - Express request with query params (skip, limit).
   * @param res - Express response.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const skip = parseInt(req.query.skip as string, 10) || 0;
      const limit = parseInt(req.query.limit as string, 10) || 10;
      const result = await this._service.getAll(skip, limit);
      ResponseHandler.ok(res, result);
    } catch (err) {
      this._log.error('Failed to list accounts', { error: err });
      ResponseHandler.error(res, 'Failed to list accounts', 500);
    }
  }

  /**
   * Retrieves a single account by ID with stats.
   * @param req - Express request with account id in params.
   * @param res - Express response.
   */
  @httpGet('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getById(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const account = await this._service.getById(req.params.id);
      if (!account) {
        ResponseHandler.notFound(res, 'Account not found');
        return;
      }
      ResponseHandler.ok(res, account);
    } catch (err) {
      this._log.error('Failed to get account', { error: err, accountId: req.params.id });
      ResponseHandler.error(res, 'Failed to get account', 500);
    }
  }

  /**
   * Updates an account by ID.
   * @param req - Express request with account id in params and body data.
   * @param res - Express response.
   */
  @httpPut('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async update(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const account = await this._service.update(req.params.id, req.body);
      ResponseHandler.updated(res, account);
    } catch (err) {
      this._log.error('Failed to update account', { error: err, accountId: req.params.id });
      ResponseHandler.error(res, 'Failed to update account', 500);
    }
  }

  /**
   * Deletes an account by ID.
   * @param req - Express request with account id in params.
   * @param res - Express response.
   */
  @httpDelete('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._service.delete(req.params.id);
      ResponseHandler.deleted(res);
    } catch (err) {
      this._log.error('Failed to delete account', { error: err, accountId: req.params.id });
      ResponseHandler.error(res, 'Failed to delete account', 500);
    }
  }
}
