import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { ScraperConfigNotFoundError } from '@scrapers/revolico/errors/scraper-config-not-found.error';
import { ScraperConfigAlreadyExistsError } from '@scrapers/revolico/errors/scraper-config-already-exists.error';
import { ScraperConfigRepository } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { toScraperConfigResponseDTO, IScraperConfigResponseDTO } from '@scrapers/revolico/mappers/scraper-config.mapper';

/**
 * Business logic for the ScraperConfig CRUD API.
 *
 * Responsibilities:
 *   - Enforce "create" is strict: `findByKey` first, then `upsert`. A duplicate
 *     `storeKey` becomes a 409 instead of silently overwriting.
 *   - Invalidate the in-memory registry after every write so the next worker
 *     picks up the new expression immediately, without waiting for the 30s TTL.
 *   - Translate persistence errors (e.g. invalid JSONata from
 *     `ScraperConfigRepository.upsert`) and missing-row conditions into the
 *     domain error classes that the controller converts to HTTP status codes.
 *
 * @class ScraperConfigService
 */
@injectable()
export class ScraperConfigService {
  public constructor(
    @inject(TYPES.ScraperConfigRepository) private readonly _repo: ScraperConfigRepository,
    @inject(TYPES.ScraperConfigRegistry) private readonly _registry: ScraperConfigRegistryService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScraperConfigService.name;
  }

  /**
   * Create a new `ScraperConfig` row. Throws if `storeKey` already exists.
   *
   * @param {string} storeKey - The unique key (e.g. `revolico:listing`).
   * @param {string} expression - JSONata source. Validated by the repo.
   * @returns {Promise<IScraperConfigResponseDTO>} The persisted row.
   * @throws {ScraperConfigAlreadyExistsError} When the `storeKey` is taken.
   * @throws {Error} When `expression` fails JSONata parse (propagated).
   */
  public async create(storeKey: string, expression: string): Promise<IScraperConfigResponseDTO> {
    this._log.debug('Creating ScraperConfig', { storeKey });

    const existing = await this._repo.findByKey(storeKey);
    if (existing) {
      this._log.warn('ScraperConfig already exists for storeKey', { storeKey });
      throw new ScraperConfigAlreadyExistsError(storeKey);
    }

    const row = await this._repo.upsert(storeKey, expression);
    this._registry.invalidate(storeKey);
    this._log.info('ScraperConfig created', { storeKey, id: row.id });
    return toScraperConfigResponseDTO(row);
  }

  /**
   * List every row (enabled and disabled) sorted by `storeKey`.
   *
   * @returns {Promise<IScraperConfigResponseDTO[]>} All rows mapped to wire DTOs.
   */
  public async list(): Promise<IScraperConfigResponseDTO[]> {
    this._log.debug('Listing all ScraperConfig rows');
    const rows = await this._repo.findAll();
    return rows.map(toScraperConfigResponseDTO);
  }

  /**
   * Look up one row by `storeKey`.
   *
   * @param {string} storeKey - The key to look up.
   * @returns {Promise<IScraperConfigResponseDTO>} The mapped row.
   * @throws {ScraperConfigNotFoundError} When no row exists.
   */
  public async findOne(storeKey: string): Promise<IScraperConfigResponseDTO> {
    this._log.debug('Fetching ScraperConfig by storeKey', { storeKey });
    const row = await this._repo.findByKey(storeKey);
    if (!row) {
      throw new ScraperConfigNotFoundError(storeKey);
    }
    return toScraperConfigResponseDTO(row);
  }

  /**
   * Update the `expression` of an existing row. Throws if the row is missing.
   *
   * @param {string} storeKey - The key to update.
   * @param {string} expression - New JSONata source.
   * @returns {Promise<IScraperConfigResponseDTO>} The updated row.
   * @throws {ScraperConfigNotFoundError} When no row exists for `storeKey`.
   * @throws {Error} When `expression` fails JSONata parse (propagated).
   */
  public async update(storeKey: string, expression: string): Promise<IScraperConfigResponseDTO> {
    this._log.debug('Updating ScraperConfig expression', { storeKey });

    const existing = await this._repo.findByKey(storeKey);
    if (!existing) {
      throw new ScraperConfigNotFoundError(storeKey);
    }

    const row = await this._repo.upsert(storeKey, expression);
    this._registry.invalidate(storeKey);
    this._log.info('ScraperConfig updated', { storeKey, version: row.version });
    return toScraperConfigResponseDTO(row);
  }
}
