import { AppError } from '@shared/errors/app.error';

/**
 * Thrown when a `POST` request asks to create a `ScraperConfig` for a
 * `storeKey` that already has a row. Surfaced as 409 by the controller.
 *
 * @class ScraperConfigAlreadyExistsError
 * @extends {AppError}
 */
export class ScraperConfigAlreadyExistsError extends AppError {
  public constructor(public readonly storeKey: string) {
    super(`ScraperConfig already exists for storeKey="${storeKey}"`, 409, 'SCRAPER_CONFIG_ALREADY_EXISTS');
  }
}
