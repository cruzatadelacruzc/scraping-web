import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when attempting to create a Rule with a ruleKey that already exists.
 */
export class RuleAlreadyExistsError extends AppError {
  public constructor(public readonly ruleKey: string) {
    super(`Rule already exists for ruleKey="${ruleKey}"`, 409, 'RULE_ALREADY_EXISTS');
  }
}
