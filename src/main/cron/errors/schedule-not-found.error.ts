/**
 * Domain error thrown when a scraping schedule is not found.
 */
export class ScheduleNotFoundError extends Error {
  public constructor(public readonly scheduleId: string) {
    super(`Scraping schedule not found for id="${scheduleId}"`);
    this.name = 'ScheduleNotFoundError';
    Object.setPrototypeOf(this, ScheduleNotFoundError.prototype);
  }
}
