import { injectable, inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { RuleRepository } from './repositories/rule.repository';
import { FALLBACK_RULES } from './rule-fallbacks';

interface ICacheEntry {
  values: string[];
  expiresAt: number;
}

/**
 * In-memory cache for rule-based extraction word lists.
 *
 * ## Lifecycle
 * 1. Constructor populates the cache with FALLBACK_RULES (synchronous — sub-millisecond).
 * 2. Kicks off an async DB warm (`_warmFromDb`) that replaces entries when complete.
 * 3. On API write, `invalidate()` evicts a key and re-fetches from DB.
 * 4. On TTL expiry (30 s), `get()` returns stale values while triggering a background refresh.
 *
 * The hot path (`get()`) is synchronous — it never blocks on I/O.
 */
@injectable()
export class RuleRegistryService {
  private static readonly TTL_MS = 30_000;
  private readonly _cache = new Map<string, ICacheEntry>();
  private _warmStarted = false;

  public constructor(
    @inject(TYPES.RuleRepository) private readonly _repo: RuleRepository,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = RuleRegistryService.name;
    // Bootstrap with hardcoded fallbacks so the hot path is never blocked
    for (const [key, values] of Object.entries(FALLBACK_RULES)) {
      this._cache.set(key, { values, expiresAt: Date.now() + RuleRegistryService.TTL_MS });
    }
  }

  /**
   * Returns the word-list values for a rule key. Always reads from the
   * in-memory cache — never blocks on I/O.
   *
   * @param {string} ruleKey - The rule category key (e.g. "brands", "colors").
   * @returns {string[]} The word-list array, or [] if the key is unknown.
   */
  public get(ruleKey: string): string[] {
    if (!this._warmStarted) {
      this._warmStarted = true;
      this._warmFromDb();
    }
    const entry = this._cache.get(ruleKey);
    if (!entry) return [];
    if (entry.expiresAt <= Date.now()) {
      this._refresh(ruleKey);
    }
    return entry.values;
  }

  /**
   * Evicts a key from cache and triggers an async re-fetch from the database.
   * Called by RuleService after every DB write (create / update).
   *
   * @param {string} ruleKey - The rule key to invalidate.
   */
  public invalidate(ruleKey: string): void {
    this._cache.delete(ruleKey);
    this._refresh(ruleKey);
  }

  /**
   * Evicts a key from cache without re-fetching from the database.
   * Used when a rule is permanently deleted — unlike invalidate(),
   * this does NOT fall back to FALLBACK_RULES.
   *
   * @param {string} ruleKey - The rule key to evict.
   */
  public evict(ruleKey: string): void {
    this._cache.delete(ruleKey);
  }

  // ── private ──────────────────────────────────────────────────────────

  /** Loads all enabled rules from DB and cleans up stale fallback entries. */
  private async _warmFromDb(): Promise<void> {
    try {
      const rows = await this._repo.findAllEnabled();
      const dbKeys = new Set(rows.map(r => r.ruleKey));

      // Remove fallback-cached keys that were permanently deleted from DB
      let cleaned = 0;
      for (const key of Object.keys(FALLBACK_RULES)) {
        if (!dbKeys.has(key)) {
          this._cache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        this._log.info(`Cleaned ${cleaned} stale fallback keys from cache (deleted from DB)`);
      } else {
        this._log.debug('No stale fallback keys to clean');
      }

      for (const row of rows) {
        const values = row.values as string[];
        this._cache.set(row.ruleKey, {
          values,
          expiresAt: Date.now() + RuleRegistryService.TTL_MS,
        });
      }
      this._log.info(`Rule registry warmed from DB (${rows.length} rules)`);
    } catch (err) {
      this._log.warn('Rule registry DB load failed — using hardcoded fallbacks', (err as Error).message);
    }
  }

  /** Async re-fetch of a single key. Silently keeps stale values on failure. */
  private _refresh(ruleKey: string): void {
    this._repo
      .findByKey(ruleKey)
      .then(row => {
        if (row && row.enabled) {
          this._cache.set(ruleKey, {
            values: row.values as string[],
            expiresAt: Date.now() + RuleRegistryService.TTL_MS,
          });
        } else if (!row) {
          // Key not in DB — re-populate from fallback if available
          const fallback = FALLBACK_RULES[ruleKey];
          if (fallback) {
            this._cache.set(ruleKey, {
              values: fallback,
              expiresAt: Date.now() + RuleRegistryService.TTL_MS,
            });
          }
        }
      })
      .catch((err: unknown) => {
        this._log.warn(`Rule refresh failed for '${ruleKey}' — cache may be stale`, (err as Error).message);
      });
  }
}
