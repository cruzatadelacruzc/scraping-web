import { controller, request, response, httpGet, httpPost, httpPut, httpDelete } from 'inversify-express-utils';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { AlarmService } from '@alarms/services/alarm.service';
import { CreateAlarmDTO } from '@alarms/dto/create-alarm.dto';
import { UpdateAlarmDTO } from '@alarms/dto/update-alarm.dto';
import { AlarmNotFoundError } from '@alarms/errors/alarm-not-found.error';

@controller('/api/alarms')
export class AlarmController {
  public constructor(@inject(TYPES.AlarmService) private readonly _alarmService: AlarmService) {}

  @httpPost('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'), ValidateRequestMiddleware.with(CreateAlarmDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    const dto = CreateAlarmDTO.from(req.body);
    const alarm = await this._alarmService.create(dto);
    ResponseHandler.created(res, 'Alarm created', { alarm });
  }

  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    const alarms = await this._alarmService.getAll();
    ResponseHandler.ok(res, { alarms });
  }

  @httpGet('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async get(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const alarm = await this._alarmService.getById(req.params.id);
      ResponseHandler.wrapOrNotFound(res, alarm);
    } catch (err) {
      if (err instanceof AlarmNotFoundError) {
        ResponseHandler.notFound(res, err.message);
      } else {
        throw err;
      }
    }
  }

  @httpPut('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'), ValidateRequestMiddleware.with(UpdateAlarmDTO))
  public async update(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const dto = UpdateAlarmDTO.from(req.body);
      const alarm = await this._alarmService.update(req.params.id, dto);
      ResponseHandler.updated(res, { alarm });
    } catch (err) {
      if (err instanceof AlarmNotFoundError) {
        ResponseHandler.notFound(res, err.message);
      } else {
        throw err;
      }
    }
  }

  @httpDelete('/:id', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._alarmService.delete(req.params.id);
      ResponseHandler.deleted(res);
    } catch (err) {
      if (err instanceof AlarmNotFoundError) {
        ResponseHandler.notFound(res, err.message);
      } else {
        throw err;
      }
    }
  }
}
