/**
 * Thrown when a `ScraperConfig` row is requested for a `storeKey` that does
 * not exist in the database. Surfaced as 404 by the controller.
 *
 * @class ScraperConfigNotFoundError
 * @extends {Error}
 */
export class ScraperConfigNotFoundError extends Error {
  public constructor(public readonly storeKey: string) {
    super(`ScraperConfig not found for storeKey="${storeKey}"`);
    this.name = 'ScraperConfigNotFoundError';
    Object.setPrototypeOf(this, ScraperConfigNotFoundError.prototype);
  }
}
