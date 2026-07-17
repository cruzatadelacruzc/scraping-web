import { AppError } from '@shared/errors/app.error';

/**
 * Domain error thrown when a scraping schedule is not found.
 */
export class ScheduleNotFoundError extends AppError {
  public constructor(public readonly scheduleId: string) {
    super(`Scraping schedule not found for id="${scheduleId}"`, 404, 'SCHEDULE_NOT_FOUND');
  }
}
