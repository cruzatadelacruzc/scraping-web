/**
 * Thrown when a Rule lookup by ruleKey yields no row in the database.
 */
export class RuleNotFoundError extends Error {
  public constructor(public readonly ruleKey: string) {
    super(`Rule not found for ruleKey="${ruleKey}"`);
    this.name = 'RuleNotFoundError';
    Object.setPrototypeOf(this, RuleNotFoundError.prototype);
  }
}
