/**
 * Thrown when attempting to create a Rule with a ruleKey that already exists.
 */
export class RuleAlreadyExistsError extends Error {
  public constructor(public readonly ruleKey: string) {
    super(`Rule already exists for ruleKey="${ruleKey}"`);
    this.name = 'RuleAlreadyExistsError';
    Object.setPrototypeOf(this, RuleAlreadyExistsError.prototype);
  }
}
