import { AppError } from '@shared/errors/app.error';

export class PlanLimitReachedError extends AppError {
  public constructor() {
    super('Your current plan does not allow creating more alarms. Please upgrade your plan.', 403, 'PLAN_LIMIT_REACHED');
  }
}
