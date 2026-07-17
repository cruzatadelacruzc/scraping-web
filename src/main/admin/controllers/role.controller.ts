import { Request, Response } from 'express';
import { controller, httpGet, httpPost, httpPatch, httpDelete, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { ZodError } from 'zod';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { RoleInactiveError } from '@admin/errors/role-inactive.error';
import { RoleNotFoundError } from '@admin/errors/role-not-found.error';
import { SystemRoleProtectedError } from '@admin/errors/system-role-protected.error';
import { RoleService } from '@admin/services/role.service';
import { CreateRoleDTO, ListRolesQueryDTO } from '@admin/services/dto/role.dto';

@controller('/api/admin')
export class RoleController {
  public constructor(
    @inject(TYPES.RoleService) private readonly _service: RoleService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RoleController.name;
  }

  /**
   * Lists roles with user counts, optionally filtered by activation state.
   * @param req - Express request; optional `status` query param ('active' | 'inactive').
   * @param res - Express response.
   */
  @httpGet('/roles', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const query = ListRolesQueryDTO.from(req.query);
      const roles = await this._service.getAll(query.status);
      ResponseHandler.ok(res, { roles });
    } catch (err) {
      if (err instanceof ZodError) {
        ResponseHandler.badRequest(res, 'Invalid status filter: must be "active" or "inactive"');
        return;
      }
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
   * Toggles a role between active and deactivated (soft-delete).
   * Replaces the former DELETE endpoint — roles are never physically deleted.
   * @param req - Express request with role id in params.
   * @param res - Express response with the updated role.
   */
  @httpPatch('/roles/:id/toggle', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async toggleActive(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const role = await this._service.toggleActive(req.params.id);
      ResponseHandler.ok(res, { role });
    } catch (err) {
      if (err instanceof RoleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      if (err instanceof SystemRoleProtectedError) {
        ResponseHandler.error(res, err.message, err.statusCode);
        return;
      }
      this._log.error('Failed to toggle role', { error: err, roleId: req.params.id });
      ResponseHandler.error(res, 'Failed to toggle role', 500);
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
      if (err instanceof RoleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      if (err instanceof RoleInactiveError) {
        ResponseHandler.error(res, err.message, err.statusCode);
        return;
      }
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
