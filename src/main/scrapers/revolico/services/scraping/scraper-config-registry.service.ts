import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { buildJsonataError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import {
  ScraperConfigRepository,
  type ScraperConfigModel,
} from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';

interface ICacheEntry {
  value: ScraperConfigModel;
  expiresAt: number;
}

/**
 * In-memory TTL cache for `ScraperConfig` rows. The workers consult this on
 * the hot path; only the first `get(storeKey)` within `TTL_MS` hits Postgres.
 *
 * Cache is invalidated by:
 *   - TTL expiry (default 30s) — picks up changes made via SQL.
 *   - Manual `invalidate(storeKey)` — used after a programmatic config update
 *     if the team wants immediate propagation without waiting for TTL.
 *
 * On a miss, the row is fetched via {@link ScraperConfigRepository.findByKey}
 * (NOT `findEnabledByKey`) so this service can distinguish `CONFIG_MISSING`
 * from `CONFIG_DISABLED` in the error code surfaced to Bull-Board.
 *
 * @class ScraperConfigRegistryService
 */
@injectable()
export class ScraperConfigRegistryService {
  private static readonly TTL_MS = 30_000;
  private readonly _cache = new Map<string, ICacheEntry>();

  public constructor(
    @inject(TYPES.ScraperConfigRepository) private readonly _repo: ScraperConfigRepository,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScraperConfigRegistryService.name;
  }

  /**
   * Resolve a `ScraperConfig` by `storeKey`. Hits the cache when warm,
   * otherwise loads from the repository and caches for {@link TTL_MS}.
   *
   * @param {string} storeKey - The ScraperConfig key (e.g. `revolico:listing`).
   * @returns {Promise<ScraperConfigModel>} The enabled row.
   * @throws {JsonataExtractionError} with code `CONFIG_MISSING` if the row
   *   does not exist, or `CONFIG_DISABLED` if it exists with `enabled = false`.
   */
  public async get(storeKey: string): Promise<ScraperConfigModel> {
    const now = Date.now();
    const cached = this._cache.get(storeKey);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const row = await this._repo.findByKey(storeKey);
    if (!row) {
      this._log.warn('[scraper-config-registry] ScraperConfig row not found in DB', { storeKey });
      throw buildJsonataError('CONFIG_MISSING', storeKey);
    }
    if (!row.enabled) {
      this._log.warn('[scraper-config-registry] ScraperConfig row exists but is disabled', { storeKey });
      throw buildJsonataError('CONFIG_DISABLED', storeKey);
    }

    this._cache.set(storeKey, { value: row, expiresAt: now + ScraperConfigRegistryService.TTL_MS });
    return row;
  }

  /**
   * Drop the cached entry for `storeKey`. The next `get(storeKey)` will
   * re-query the repository. No-op when nothing is cached for the key.
   *
   * @param {string} storeKey - The ScraperConfig key to evict.
   */
  public invalidate(storeKey: string): void {
    this._cache.delete(storeKey);
  }
}
