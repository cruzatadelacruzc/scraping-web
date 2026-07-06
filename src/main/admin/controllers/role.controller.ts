import { Request, Response } from 'express';
import { controller, httpGet, httpPost, httpDelete, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { RoleService } from '@admin/services/role.service';
import { CreateRoleDTO } from '@admin/services/dto/role.dto';

@controller('/api/admin')
export class RoleController {
  public constructor(
    @inject(TYPES.RoleService) private readonly _service: RoleService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RoleController.name;
  }

  /**
   * Lists all roles with user counts.
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/roles', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const roles = await this._service.getAll();
      ResponseHandler.ok(res, { roles });
    } catch (err) {
      this._log.error('Failed to list roles', { error: err });
      ResponseHandler.error(res, 'Failed to list roles', 500);
    }
  }

  /**
   * Creates a new role.
   * @param req - Express request with role data in body.
   * @param res - Express response.
   */
  @httpPost('/roles', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = CreateRoleDTO.from(req.body);
      const role = await this._service.create(dto.name, dto.accountId);
      ResponseHandler.created(res, 'Role created', role);
    } catch (err) {
      this._log.error('Failed to create role', { error: err });
      ResponseHandler.error(res, 'Failed to create role', 500);
    }
  }

  /**
   * Deletes a role by ID.
   * @param req - Express request with role id in params.
   * @param res - Express response.
   */
  @httpDelete('/roles/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._service.delete(req.params.id);
      ResponseHandler.deleted(res);
    } catch (err) {
      this._log.error('Failed to delete role', { error: err, roleId: req.params.id });
      ResponseHandler.error(res, 'Failed to delete role', 500);
    }
  }

  /**
   * Assigns a role to a user.
   * @param req - Express request with userId and roleId in params.
   * @param res - Express response.
   */
  @httpPost('/users/:userId/roles/:roleId', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async assignRole(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._service.assignRole(req.params.userId, req.params.roleId);
      ResponseHandler.ok(res, { message: 'Role assigned successfully' });
    } catch (err) {
      this._log.error('Failed to assign role', { error: err, userId: req.params.userId, roleId: req.params.roleId });
      ResponseHandler.error(res, 'Failed to assign role', 500);
    }
  }

  /**
   * Unassigns a role from a user.
   * @param req - Express request with userId and roleId in params.
   * @param res - Express response.
   */
  @httpDelete('/users/:userId/roles/:roleId', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async unassignRole(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._service.unassignRole(req.params.userId, req.params.roleId);
      ResponseHandler.ok(res, { message: 'Role unassigned successfully' });
    } catch (err) {
      this._log.error('Failed to unassign role', { error: err, userId: req.params.userId, roleId: req.params.roleId });
      ResponseHandler.error(res, 'Failed to unassign role', 500);
    }
  }
}
