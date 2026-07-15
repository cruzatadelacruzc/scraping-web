import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when a `ScraperConfig` row is requested for a `storeKey` that does
 * not exist in the database. Surfaced as 404 by the controller.
 *
 * @class ScraperConfigNotFoundError
 * @extends {AppError}
 */
export class ScraperConfigNotFoundError extends AppError {
  public constructor(public readonly storeKey: string) {
    super(`ScraperConfig not found for storeKey="${storeKey}"`, 404, 'SCRAPER_CONFIG_NOT_FOUND');
  }
}
