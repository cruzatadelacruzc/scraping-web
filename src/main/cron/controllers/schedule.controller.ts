import { Request, Response } from 'express';
import { controller, httpGet, httpPost, httpPut, httpDelete, httpPatch, request, response, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ILogger } from '@shared/logger.interface';
import { ScheduleService } from '@cron/services/schedule.service';
import { StoreRegistry } from '@cron/store-registry';
import { CreateScheduleDTO, UpdateScheduleDTO } from '@cron/services/dto';
import { ScheduleNotFoundError } from '@cron/errors';

/**
 * SUPER_ADMIN-only CRUD for scraping schedule management.
 *
 * Endpoints:
 *   GET    /api/admin/scraping-schedules              — list all schedules
 *   GET    /api/admin/scraping-schedules/:id           — get one schedule
 *   POST   /api/admin/scraping-schedules               — create a new schedule
 *   PUT    /api/admin/scraping-schedules/:id           — update a schedule
 *   DELETE /api/admin/scraping-schedules/:id           — delete a schedule
 *   PATCH  /api/admin/scraping-schedules/:id/toggle    — toggle enabled flag
 */
@controller('/api/admin/scraping-schedules')
export class ScheduleController {
  public constructor(
    @inject(TYPES.ScheduleService) private readonly _service: ScheduleService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScheduleController.name;
  }

  /**
   * Lists all scraping schedules.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@response() res: Response): Promise<void> {
    try {
      const schedules = await this._service.list();
      ResponseHandler.ok(res, { schedules });
    } catch (err) {
      this._log.error('Failed to list scraping schedules', { error: err });
      ResponseHandler.error(res, 'Failed to list scraping schedules', 500);
    }
  }

  /**
   * Returns a single scraping schedule by its id.
   */
  @httpGet('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async findOne(@requestParam('id') id: string, @response() res: Response): Promise<void> {
    try {
      const schedule = await this._service.findOne(id);
      ResponseHandler.ok(res, { schedule });
    } catch (err) {
      if (err instanceof ScheduleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to get scraping schedule', { scheduleId: id, error: err });
      ResponseHandler.error(res, 'Failed to get scraping schedule', 500);
    }
  }

  /**
   * Creates a new scraping schedule.
   */
  @httpPost('/', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(CreateScheduleDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = req.body as CreateScheduleDTO;
      const schedule = await this._service.create(dto);
      ResponseHandler.created(res, 'Scraping schedule created', { schedule });
    } catch (err) {
      this._log.error('Failed to create scraping schedule', { error: err });
      ResponseHandler.error(res, 'Failed to create scraping schedule', 500);
    }
  }

  /**
   * Updates an existing scraping schedule.
   */
  @httpPut('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(UpdateScheduleDTO))
  public async update(@requestParam('id') id: string, @request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = req.body as UpdateScheduleDTO;
      const schedule = await this._service.update(id, dto);
      ResponseHandler.ok(res, { schedule });
    } catch (err) {
      if (err instanceof ScheduleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to update scraping schedule', { scheduleId: id, error: err });
      ResponseHandler.error(res, 'Failed to update scraping schedule', 500);
    }
  }

  /**
   * Deletes a scraping schedule.
   */
  @httpDelete('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@requestParam('id') id: string, @response() res: Response): Promise<void> {
    try {
      await this._service.delete(id);
      ResponseHandler.deleted(res);
    } catch (err) {
      if (err instanceof ScheduleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to delete scraping schedule', { scheduleId: id, error: err });
      ResponseHandler.error(res, 'Failed to delete scraping schedule', 500);
    }
  }

  /**
   * Toggles the enabled flag of a scraping schedule.
   */
  @httpPatch('/:id/toggle', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async toggle(@requestParam('id') id: string, @response() res: Response): Promise<void> {
    try {
      const schedule = await this._service.toggle(id);
      ResponseHandler.ok(res, { schedule });
    } catch (err) {
      if (err instanceof ScheduleNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      this._log.error('Failed to toggle scraping schedule', { scheduleId: id, error: err });
      ResponseHandler.error(res, 'Failed to toggle scraping schedule', 500);
    }
  }
}

/**
 * SUPER_ADMIN-only endpoint that lists registered store configurations.
 *
 * Endpoints:
 *   GET    /api/admin/stores   — list all registered stores
 */
@controller('/api/admin')
export class StoreInfoController {
  public constructor(@inject(TYPES.StoreRegistry) private readonly _stores: StoreRegistry) {}

  /**
   * Lists all registered stores with their queue names and job schemas.
   */
  @httpGet('/stores', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async listStores(@response() res: Response): Promise<void> {
    try {
      ResponseHandler.ok(res, { stores: this._stores.list() });
    } catch {
      ResponseHandler.error(res, 'Failed to list stores', 500);
    }
  }
}
