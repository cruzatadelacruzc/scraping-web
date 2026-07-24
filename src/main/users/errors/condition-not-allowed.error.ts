import { AppError } from '@shared/errors/app.error';

export class ConditionNotAllowedError extends AppError {
  public constructor(condition: string) {
    super(`Condition "${condition}" is not allowed under your current plan. Please upgrade your plan.`, 403, 'CONDITION_NOT_ALLOWED');
  }
}
