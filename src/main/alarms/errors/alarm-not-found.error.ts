import { AppError } from '@shared/errors/app.error';

export class AlarmNotFoundError extends AppError {
  public constructor(alarmId: string) {
    super(`Alarm with id "${alarmId}" not found`, 404, 'ALARM_NOT_FOUND');
  }
}
