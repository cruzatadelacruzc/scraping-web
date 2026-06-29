/**
 * Thrown when a `POST` request asks to create a `ScraperConfig` for a
 * `storeKey` that already has a row. Surfaced as 409 by the controller.
 *
 * @class ScraperConfigAlreadyExistsError
 * @extends {Error}
 */
export class ScraperConfigAlreadyExistsError extends Error {
  public constructor(public readonly storeKey: string) {
    super(`ScraperConfig already exists for storeKey="${storeKey}"`);
    this.name = 'ScraperConfigAlreadyExistsError';
    Object.setPrototypeOf(this, ScraperConfigAlreadyExistsError.prototype);
  }
}
