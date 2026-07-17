import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import { CONFIG, TIME_OUT, VIEW_PORT } from '@utils/puppeteer.utils';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { inject, injectable } from 'inversify';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { PageLoadError } from '../errors/page-load.error';
import { DOM_TO_JSON_SOURCE } from './scraping/utils/dom-to-json.util';

@injectable()
export class RevolicoFetchDataService implements IFetchProductData {
  private _baseURL: string;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._baseURL = 'https://www.revolico.com';
    this._log.context = RevolicoFetchDataService.name;
  }

  public buildURL(category: string, subcategory: string, pageNumber: number): string {
    const params = [`category=${category}`, subcategory && `subcategory=${subcategory}`, pageNumber && `page=${pageNumber}`]
      .filter(Boolean)
      .join('&');

    const url = `${this._baseURL}/search?${params}`;
    this._log.debug(`Fetching products from: ${url}`);
    return url;
  }

  /**
   * Navigate to `url` and serialize the DOM subtree(s) matching `selector`
   * into a JSON tree, returned to Node. The HTML never crosses the
   * Puppeteer→Node bridge.
   *
   * Browser-side, the helper `domToJson` (declared in `DOM_TO_JSON_SOURCE`)
   * walks `document.querySelectorAll(selector)` and produces a tree of
   * `{ tag, attrs, children, text? }` nodes. When a single element matches
   * we return that node directly; when multiple match, we return the array.
   *
   * Implementation note: per-call browser launch. Fine for the MVP scrape
   * volume; a future optimization may pool browsers per worker.
   *
   * @param {string} url - Fully-qualified URL to load.
   * @param {string} selector - CSS selector matched inside the rendered page.
   * @param {IJobContext} [ctx] - Optional job context for progress + logging.
   * @returns {Promise<T>} Serialized DOM tree(s), typed by the caller.
   */
  public async fetchRenderedJson<T>(url: string, selector: string, ctx?: IJobContext): Promise<T> {
    if (!url) {
      this._log.warn('[revolico] fetchRenderedJson called without url');
      throw new InvalidParameterError('url');
    }
    if (!selector) {
      this._log.warn('[revolico] fetchRenderedJson called without selector');
      throw new InvalidParameterError('selector');
    }

    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch(CONFIG);

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TIME_OUT);
      page.setViewport(VIEW_PORT);

      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      if (response?.status() !== 200) {
        this._log.warn('[revolico] non-200 response from page.goto', {
          url,
          selector,
          status: response?.status(),
        });
        throw new PageLoadError(response?.status(), url);
      }

      await ctx?.log(`Navigated to ${url}`);

      const evalBody = buildEvalBody();
      const runner = new Function('sel', evalBody) as (sel: string) => unknown;
      const result = await page.evaluate(runner, selector);

      return result as T;
    } finally {
      await browser.close();
    }
  }
}

/**
 * Builds the function body that Puppeteer's `page.evaluate` runs in the browser
 * to (a) define the `domToJson` helper and (b) walk the elements matched by the
 * CSS selector into a JSON-serializable tree.
 *
 * CRITICAL: `DOM_TO_JSON_SOURCE` ends with `return domToJson;`. If we concatenate
 * it directly with another return statement, the early return short-circuits and
 * the traversal below becomes unreachable — `page.evaluate` ends up returning
 * the `domToJson` function reference (which JSON-serializes to `{}`) instead of
 * the actual tree. We MUST wrap `DOM_TO_JSON_SOURCE` in an IIFE so the
 * `domToJson` function is captured into a local var, then run the selector
 * traversal against that local binding.
 *
 * Exported so the regression test can exercise the eval body against a fake
 * DOM without spinning up a real browser.
 */
export function buildEvalBody(): string {
  return `var domToJson = (function(){ ${DOM_TO_JSON_SOURCE} })(); var els = document.querySelectorAll(sel); var out = []; for (var i = 0; i < els.length; i++) { var n = domToJson(els[i]); if (n !== null) out.push(n); } return out.length === 1 ? out[0] : out;`;
}
