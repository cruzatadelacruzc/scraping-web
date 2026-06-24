import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { IProductBase, IProductDetails } from '@shared/product-base.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';

export interface IFetchProductData {
  /**
   * Builds the URL for the API request.
   *
   * @param category The category name for the request.
   * @param category The subcategory name for the request.
   * @param pageNumber The page number for the request.
   * @returns The built URL.
   */
  buildURL(category: string, subcategory?: string, pageNumber?: number): string;

  /**
   * Generic Puppeteer-driven fetch: navigate to `url`, then return the DOM
   * subtree(s) matching `selector` serialized to a JSON tree (using the
   * browser-side `domToJson` helper). The HTML never crosses the
   * Puppeteer→Node bridge — only the serialized JSON does.
   *
   * The caller passes the `selector` explicitly. For the MVP, selectors are
   * hardcoded by the worker; a future iteration may move them into
   * `ScraperConfig` so they can be tuned without a redeploy.
   *
   * @param {string} url - The fully-qualified URL to navigate to.
   * @param {string} selector - A CSS selector matching one or more elements
   *   inside the rendered page. When multiple elements match, an array of
   *   `DomNode` is returned; when one matches, the single `DomNode` is returned.
   * @param {IJobContext} [ctx] - Optional job context for progress + logging.
   * @returns {Promise<T>} The serialized tree, typed by the caller.
   */
  fetchRenderedJson<T>(url: string, selector: string, ctx?: IJobContext): Promise<T>;

  /**
   * Fetches products information by category and subcategory.
   *
   * @param category The category to fetch products from.
   * @param subcategory The subcategory to fetch products from.
   * @param pageNumber The page number for the request.
   * @param totalPages The number of pages to scrape.
   * @param job Backend-agnostic job context used for progress and logging.
   * @returns {Promise<T[]>} A promise that resolves to an array of products.
   * @deprecated Replaced by the JSONata-driven `GenericListingScraperService`,
   *   which uses `fetchRenderedJson` and evaluates a `ScraperConfig` expression.
   *   Kept temporarily for the migration window; will be removed once the
   *   generic scrapers are wired into all queues.
   */
  fetchProductInfoByCategory<T extends IProductBase>(
    category: string,
    subcategory?: string,
    pageNumber?: number,
    totalPages?: number,
    job?: IJobContext<ScrapingProductsType>,
  ): Promise<T[]>;

  /**
   * Fetch product information
   *
   * @param url The URL to fetch product from.
   * @param job Backend-agnostic job context used for progress and logging.
   * @returns {Promise<IProductDetails>} A promise that resolves the product details.
   * @deprecated Replaced by the JSONata-driven `GenericDetailScraperService`,
   *   which uses `fetchRenderedJson` and evaluates a `ScraperConfig` expression.
   */
  fetchProductDetails(url: string, job: IJobContext<{ url: string }[]>): Promise<IProductDetails | null>;
}
