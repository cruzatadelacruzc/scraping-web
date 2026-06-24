import { inject, injectable } from 'inversify';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { buildFullUrl, parseCost } from '@utils/normalize-data.util';
import { extractDataFromUrl } from '@scrapers/revolico/utils/extract-data.util';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { JsonataExtractionError } from '@scrapers/revolico/errors/jsonata-extraction.error';
import { JsonataRunnerService } from '@scrapers/revolico/services/scraping/jsonata-runner.service';
import { ScraperConfigRegistryService } from '@scrapers/revolico/services/scraping/scraper-config-registry.service';
import { ScraperConfigModel } from '@scrapers/revolico/services/scraping/repositories/scraper-config.repository';
import { progressCalculate } from '@utils/queue.util';

/**
 * One row produced by the JSONata expression stored in the
 * `revolico:listing` `ScraperConfig`. The expression is a draft — the actual
 * shape depends on the live HTML and may evolve. Fields are all optional so
 * the service can tolerate partial matches gracefully.
 */
export interface IListingRow {
  url?: string;
  description?: string;
  cost?: string;
  imageURL?: string;
  isOutstanding?: boolean;
}

/**
 * Result shape produced by the `revolico:listing` JSONata expression. The
 * worker wraps rows in `{ products: IListingRow[] }` so the expression's root
 * `$` is always an object — useful when the expression needs additional
 * metadata alongside the products array in future iterations.
 */
export interface IListingResult {
  products: IListingRow[];
}

/**
 * Generic "dumb" listing scraper. The worker is config-driven:
 *
 *   1. Load the JSONata expression for `revolico:listing` from the registry.
 *   2. Puppeteer renders the search page and serializes each matching `<li>`
 *      container into a JSON tree (`fetchRenderedJson`).
 *   3. JSONata evaluates the expression against the array of trees.
 *   4. We map the resulting `IListingRow`s to `IRevolicoProduct`, reusing the
 *      existing `parseCost` / `extractDataFromUrl` / `buildFullUrl` helpers.
 *
 * If the JSONata expression fails (DOM changed, syntax bug), the typed
 * {@link JsonataExtractionError} bubbles up with the storeKey, the expression
 * source, and a 2KB snippet of the input tree already attached — Bull-Board
 * shows all of this on the failed job.
 *
 * @class GenericListingScraperService
 */
@injectable()
export class GenericListingScraperService {
  private static readonly LISTING_SELECTOR = 'div.ybloC ul > li';
  private static readonly STORE_KEY = 'revolico:listing';

  public constructor(
    @inject(TYPES.RevolicoData) private readonly _revolicoData: IFetchProductData,
    @inject(TYPES.JsonataRunner) private readonly _runner: JsonataRunnerService,
    @inject(TYPES.ScraperConfigRegistry) private readonly _registry: ScraperConfigRegistryService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = GenericListingScraperService.name;
  }

  /**
   * Queue processor: pulls a category/subcategory/pageNumber/totalPages
   * payload from the context, fetches every page's DOM tree, evaluates the
   * JSONata expression against each tree, and returns the flattened list of
   * `IRevolicoProduct`s.
   *
   * @param {IJobContext<ScrapingProductsType>} ctx - Backend-agnostic job context.
   * @returns {Promise<IRevolicoProduct[]>} Flattened products across all pages.
   * @throws {JsonataExtractionError} Propagated from the runner / registry with
   *   diagnostic context already attached.
   */
  public async processor(ctx: IJobContext<ScrapingProductsType>): Promise<IRevolicoProduct[]> {
    const { category, subcategory, pageNumber = 1, totalPages = 1 } = ctx.data;
    this._log.debug(
      `GenericListing job ${ctx.id}: category=${category} subcategory=${subcategory} page=${pageNumber} totalPages=${totalPages}`,
    );

    const cfg = await this._registry.get(GenericListingScraperService.STORE_KEY);
    const products: IRevolicoProduct[] = [];

    try {
      let remaining = totalPages;
      for (let current = pageNumber; current < pageNumber + totalPages; current++) {
        const url = this._revolicoData.buildURL(category, subcategory, current);
        await ctx.log(`Fetching listing page ${current}: ${url}`);
        const tree = await this._revolicoData.fetchRenderedJson<unknown>(url, GenericListingScraperService.LISTING_SELECTOR, ctx);
        const result = await this._runner.run<IListingResult>(cfg.expression, tree, { timeoutMs: 5000 });
        for (const row of result.products ?? []) {
          const mapped = this._mapRow(row, category, subcategory);
          if (mapped) products.push(mapped);
        }
        remaining--;
        await ctx.progress(progressCalculate(totalPages, remaining));
        if (remaining <= 0) break;
      }
    } catch (err) {
      if (err instanceof JsonataExtractionError) {
        await ctx.log(`[scraper-failure] storeKey=${cfg.storeKey}`);
        await ctx.log(`[scraper-failure] expression: ${cfg.expression}`);
        await ctx.log(`[scraper-failure] input-json (first 2KB): ${JSON.stringify(err.inputJson).slice(0, 2048)}`);
      }
      throw err;
    }

    await ctx.progress(100);
    return products;
  }

  private _mapRow(row: IListingRow, category: string, subcategory?: string): IRevolicoProduct | null {
    if (!row.url || !row.cost || !row.imageURL) return null;
    const ID = extractDataFromUrl(row.url, 'productId');
    if (!ID) return null;
    const visitedURL = this._revolicoData.buildURL(category, subcategory, 1);
    const origin = this._originOf(visitedURL);
    const url = buildFullUrl(origin, row.url);
    if (!url) return null;
    const { currency, value } = parseCost(row.cost);
    return {
      ID,
      category,
      subcategory,
      url,
      cost: row.cost,
      currency,
      price: value,
      description: row.description ?? '',
      imageURL: row.imageURL,
      isOutstanding: Boolean(row.isOutstanding),
    };
  }

  private _originOf(url: string): string {
    try {
      const u = new URL(url);
      return `${u.protocol}//${u.hostname}`;
    } catch {
      return 'https://www.revolico.com';
    }
  }
}

// Used by the implementation but not exported in the type — keep here for tests.
export type _ScraperConfigType = ScraperConfigModel;
