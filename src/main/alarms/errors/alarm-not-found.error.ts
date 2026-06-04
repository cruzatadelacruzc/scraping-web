export class AlarmNotFoundError extends Error {
  public constructor(alarmId: string) {
    super(`Alarm with id "${alarmId}" not found`);
    Object.setPrototypeOf(this, AlarmNotFoundError.prototype);
  }
}
