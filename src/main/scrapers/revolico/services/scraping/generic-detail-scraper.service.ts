import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { parseLocation, parseViews } from '@utils/normalize-data.util';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { delayRandom } from '@utils/puppeteer.utils';
import { progressCalculate } from '@utils/queue.util';
import { IPartialProductUpdate, IProductSellerSummary } from '@scrapers/revolico/services/scraping/update-payload';

/**
 * One row produced by the JSONata expression stored in the
 * `revolico:detail` `ScraperConfig`. Mirrors the shape of
 * `IRevolicoProduct.views / location / seller`. All fields are optional so
 * the service can persist partial updates when the expression matches only
 * a subset of the page structure.
 */
export interface IDetailRow {
  views?: string;
  location?: string;
  seller?: {
    name?: string;
    whatsapp?: string;
    phone?: string;
    email?: string;
  };
}

/**
 * Generic "dumb" detail scraper. Mirrors {@link GenericListingScraperService}
 * but for product detail pages. The worker is config-driven:
 *
 *   1. Load the JSONata expression for `revolico:detail` from the registry.
 *   2. Puppeteer renders the detail page and serializes the `main` container
 *      into a JSON tree (`fetchRenderedJson`).
 *   3. JSONata evaluates the expression against the tree, yielding a
 *      `IDetailRow` with views / location / seller.
 *   4. We coerce strings into typed fields via `parseViews` / `parseLocation`
 *      and persist via {@link ProductRepository.update}.
 *
 * Failures bubble up as {@link JsonataExtractionError} with diagnostic
 * context already attached — visible in Bull-Board.
 *
 * @class GenericDetailScraperService
 */
@injectable()
export class GenericDetailScraperService {
  private static readonly DETAIL_SELECTOR = 'main';
  private static readonly STORE_KEY = 'revolico:detail';

  public constructor(
    @inject(TYPES.RevolicoData) private readonly _revolicoData: IFetchProductData,
    @inject(TYPES.JsonataRunner) private readonly _runner: JsonataRunnerService,
    @inject(TYPES.ScraperConfigRegistry) private readonly _registry: ScraperConfigRegistryService,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = GenericDetailScraperService.name;
  }

  /**
   * Queue processor: pulls an array of `{ url }` payloads, fetches each
   * detail page, evaluates the JSONata expression, and updates the matching
   * Mongo product.
   *
   * @param {IJobContext<{url: string}[]>} ctx - Backend-agnostic job context.
   * @returns {Promise<string>} Human-readable summary for the queue dashboard.
   * @throws {JsonataExtractionError} Propagated from the runner / registry with
   *   diagnostic context already attached.
   */
  public async processor(ctx: IJobContext<{ url: string }[]>): Promise<string> {
    const urls = ctx.data ?? [];
    let remaining = urls.length;
    this._log.debug(`GenericDetail job ${ctx.id}: ${urls.length} URLs`);

    const cfg = await this._registry.get(GenericDetailScraperService.STORE_KEY);

    for (const { url } of urls) {
      try {
        const product = await this._repository.findOne({ url }, { _id: 1 });
        if (!product?._id) {
          await ctx.log(`Product with URL ${url} not found`);
          remaining--;
          await ctx.progress(progressCalculate(urls.length, remaining));
          continue;
        }

        const tree = await this._revolicoData.fetchRenderedJson<unknown>(url, GenericDetailScraperService.DETAIL_SELECTOR, ctx);
        const row = await this._runner.run<IDetailRow>(cfg.expression, tree, { timeoutMs: 5000 });

        const update = this._mapRow(row);
        await this._repository.update(product._id, update);
        await ctx.log(`Successfully scraped and updated product(${product._id}) at URL: ${url}`);

        remaining--;
        await ctx.progress(progressCalculate(urls.length, remaining));

        await delayRandom(1000, 3000);
      } catch (err) {
        if (err instanceof JsonataExtractionError) {
          await ctx.log(`[scraper-failure] storeKey=${cfg.storeKey}`);
          await ctx.log(`[scraper-failure] expression: ${cfg.expression}`);
          await ctx.log(`[scraper-failure] input-json (first 2KB): ${JSON.stringify(err.inputJson).slice(0, 2048)}`);
        }
        throw err;
      }
    }

    await ctx.progress(100);
    return `Processed ${urls.length} product URLs`;
  }

  private _mapRow(row: IDetailRow): IPartialProductUpdate {
    const seller: IProductSellerSummary = {
      name: row.seller?.name?.trim() ?? '',
      whatsapp: row.seller?.whatsapp?.trim() ?? '',
      phone: row.seller?.phone?.trim() ?? '',
      email: row.seller?.email?.trim() ?? '',
    };
    return {
      views: parseViews(row.views ?? '0'),
      location: row.location ? this._normalizeLocation(parseLocation(row.location)) : undefined,
      seller,
    };
  }

  private _normalizeLocation(loc: { state?: string; municipality?: string }): { state: string; municipality?: string } {
    return { state: loc.state ?? '', ...(loc.municipality ? { municipality: loc.municipality } : {}) };
  }
}
