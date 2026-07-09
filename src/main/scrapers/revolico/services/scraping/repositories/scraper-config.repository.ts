import { PrismaClient, Prisma } from '@prisma/client';
import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';

/**
 * The Prisma `ScraperConfig` model. Re-declared here so the repository layer
 * does not import the Prisma-generated namespace from application code that
 * the container assembles.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- Prisma's canonical payload helper: `{}` means "no relations included", i.e. the default scalar model.
export type ScraperConfigModel = Prisma.ScraperConfigGetPayload<{}>;

/**
 * CRUD + validate-on-write for `ScraperConfig` rows. Each row carries a
 * JSONata expression that the workers evaluate against the DOM tree produced
 * by `page.evaluate()` in Puppeteer.
 *
 * Used by:
 *   - `ScraperConfigRegistryService` (read path, cached).
 *   - Future admin tooling / migration scripts (write path).
 *
 * @class ScraperConfigRepository
 */
@injectable()
export class ScraperConfigRepository {
  public constructor(
    @inject(TYPES.PrismaClient) private readonly _prisma: PrismaClient,
    @inject(TYPES.JsonataRunner) private readonly _runner: JsonataRunnerService,
  ) {}

  /**
   * Look up a row by its `storeKey` regardless of `enabled` state.
   *
   * @param {string} storeKey - The ScraperConfig key (e.g. `revolico:listing`).
   * @returns {Promise<ScraperConfigModel | null>} The row, or null if not found.
   */
  public async findByKey(storeKey: string): Promise<ScraperConfigModel | null> {
    return this._prisma.scraperConfig.findUnique({ where: { storeKey } });
  }

  /**
   * Look up a row by `storeKey`, returning null when the row is missing OR
   * `enabled = false`. Use this from the worker hot-path so a soft-disabled
   * config is treated identically to a missing one.
   *
   * @param {string} storeKey - The ScraperConfig key.
   * @returns {Promise<ScraperConfigModel | null>} The enabled row, or null.
   */
  public async findEnabledByKey(storeKey: string): Promise<ScraperConfigModel | null> {
    const cfg = await this._prisma.scraperConfig.findUnique({ where: { storeKey } });
    if (!cfg || !cfg.enabled) return null;
    return cfg;
  }

  /**
   * List every row in `scraperConfig`, both enabled and disabled, sorted by
   * `storeKey` so the admin UI gets a stable ordering. Used by the GET list
   * endpoint — never on the worker hot-path.
   *
   * @returns {Promise<ScraperConfigModel[]>} All rows, ascending by storeKey.
   */
  public async findAll(): Promise<ScraperConfigModel[]> {
    return this._prisma.scraperConfig.findMany({ orderBy: { storeKey: 'asc' } });
  }

  /**
   * Insert-or-update a row. Defense-in-depth: parses the expression via
   * `JsonataRunnerService.validate` BEFORE persisting, unless the `storeKey`
   * starts with `llm:` (those entries store natural-language prompts, not
   * JSONata). Throws if a non-llm expression is invalid so a broken expression
   * cannot land in the table and poison the next job.
   *
   * On update, the row's `version` is left untouched — the Prisma schema
   * bumps `updatedAt` automatically. Callers that need optimistic concurrency
   * should compare `version` outside this method.
   *
   * @param {string} storeKey - The ScraperConfig key.
   * @param {string} expression - JSONata source, or plain-text prompt for `llm:*` keys.
   * @returns {Promise<ScraperConfigModel>} The persisted row.
   * @throws {Error} If `runner.validate` returns `{ ok: false }` for a non-llm key.
   */
  public async upsert(storeKey: string, expression: string): Promise<ScraperConfigModel> {
    // llm:* storeKeys hold natural-language prompts, not JSONata expressions.
    // Skip JSONata validation so they can be managed via the ScraperConfig API.
    if (!storeKey.startsWith('llm:')) {
      const validation = this._runner.validate(expression);
      if (!validation.ok) {
        throw new Error(`Invalid JSONata expression for storeKey="${storeKey}": ${validation.error}`);
      }
    }
    return this._prisma.scraperConfig.upsert({
      where: { storeKey },
      create: { storeKey, expression },
      update: { expression },
    });
  }
}
