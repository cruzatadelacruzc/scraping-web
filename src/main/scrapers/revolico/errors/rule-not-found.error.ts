import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when a Rule lookup by ruleKey yields no row in the database.
 */
export class RuleNotFoundError extends AppError {
  public constructor(public readonly ruleKey: string) {
    super(`Rule not found for ruleKey="${ruleKey}"`, 404, 'RULE_NOT_FOUND');
  }
}
