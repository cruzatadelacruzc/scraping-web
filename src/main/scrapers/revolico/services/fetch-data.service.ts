import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import { CONFIG, TIME_OUT, VIEW_PORT } from '@utils/puppeteer.utils';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { inject, injectable } from 'inversify';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { buildFullUrl, parseCost, parseLocation, parseViews } from '@utils/normalize-data.util';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { ScrapingProductsType } from './dto';
import { PageLoadError } from '../errors/page-load.error';
import { progressCalculate } from '@utils/queue.util';
import { extractDataFromUrl } from '../utils/extract-data.util';
import { IProductDetails } from '@shared/product-base.interface';
import { ElementHandle } from 'puppeteer-core';
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
    if (!url) throw new InvalidParameterError('url');
    if (!selector) throw new InvalidParameterError('selector');

    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch(CONFIG);

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TIME_OUT);
      page.setViewport(VIEW_PORT);

      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      if (response?.status() !== 200) {
        throw new PageLoadError(response?.status(), url);
      }

      await ctx?.log(`Navigated to ${url}`);

      const evalBody = `${DOM_TO_JSON_SOURCE}\nreturn (function(){ var els = document.querySelectorAll(sel); var out = []; for (var i = 0; i < els.length; i++) { var n = domToJson(els[i]); if (n !== null) out.push(n); } return out.length === 1 ? out[0] : out; })();`;
      const runner = new Function('sel', evalBody) as (sel: string) => unknown;
      const result = await page.evaluate(runner, selector);

      return result as T;
    } finally {
      await browser.close();
    }
  }

  public async fetchProductInfoByCategory<IRevolicoProduct>(
    category: string,
    subcategory: string,
    pageNumber: number = 1,
    totalPages: number = 100,
    job: IJobContext<ScrapingProductsType>,
  ): Promise<IRevolicoProduct[]> {
    this._log.debug(`Fetching products info from category: ${category}, subcategory: ${subcategory}, page: ${pageNumber}`);

    if (!category) throw new InvalidParameterError('category');

    const productsInfo: IRevolicoProduct[] = [];
    const productsInfoSet = new Set<string>();
    const buildURL = this.buildURL.bind(this);
    const log = this._log;

    if (pageNumber <= 0 || totalPages <= 0) return productsInfo;

    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch(CONFIG);

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TIME_OUT);
      page.setViewport(VIEW_PORT);

      async function scrapperOnly(currentPage: number, remainingPages: number): Promise<IRevolicoProduct[]> {
        let productQtyPage = 0;
        if (remainingPages <= 0) {
          await job.progress(100);
          return productsInfo;
        }

        const url = buildURL(category, subcategory, currentPage);
        try {
          const response = await page.goto(url, { waitUntil: 'networkidle2' });

          if (response?.status() !== 200) {
            const message = `Failed to load page: ${url} with status ${response?.status()}`;
            log.debug(message);
            await job.log(message);
            await browser.close();
            return scrapperOnly(currentPage + 1, remainingPages - 1);
          }

          await Promise.all([page.waitForSelector('div.ybloC'), page.waitForSelector('a#paginator-next')]);

          const productsContainer = await page.$('div.ybloC');
          if (productsContainer) {
            const uls = await productsContainer.$$('ul');
            for (const ul of uls) {
              const lis = await ul.$$('li');
              await Promise.all(
                lis.map(async (li: ElementHandle<Element>) => {
                  const [elememntlink, elememntCost, elememntDescription, elememntImage, elememntOutstanding] = await Promise.all([
                    li.$('a'),
                    li.$('span'),
                    li.$('p'),
                    li.$('picture img'),
                    li.$('div.dHRSzq'),
                  ]);

                  const [pathItemProduct, cost, description, imageURL, isOutstanding] = await Promise.all([
                    elememntlink?.evaluate((element: Element) => element.getAttribute('href')?.trim()),
                    elememntCost?.evaluate((element: Element) => element.textContent?.trim()),
                    elememntDescription?.evaluate((element: Element) => element.textContent?.trim() || ''),
                    elememntImage?.evaluate((element: Element) => element.getAttribute('src')?.trim()),
                    elememntOutstanding?.evaluate((element: Element) => !!element) ?? false,
                  ]);

                  let productURL;
                  if (pathItemProduct) {
                    const visitedURL = page.url();
                    const objURL = new URL(visitedURL);
                    const basetURL = `${objURL.protocol}//${objURL.hostname}`;
                    productURL = buildFullUrl(basetURL, pathItemProduct);
                  }

                  const ID = pathItemProduct ? extractDataFromUrl(pathItemProduct, 'productId') : null;

                  if (ID && category && productURL && cost && imageURL && !productsInfoSet.has(productURL)) {
                    const { currency, value } = parseCost(cost);
                    productQtyPage++;

                    productsInfoSet.add(productURL);
                    productsInfo.push({
                      ID,
                      category,
                      subcategory,
                      url: productURL,
                      cost,
                      description,
                      imageURL,
                      isOutstanding,
                      currency,
                      price: value,
                    } as IRevolicoProduct);
                  }
                }),
              );
            }
          }

          await job.progress(progressCalculate(totalPages, remainingPages));
          await job.log(`Number of products processed on page (${currentPage}) : ${productQtyPage}`);

          // Check if next page exists
          const nextButton = await page.$('a#paginator-next');
          const isNextDisabled = await nextButton?.evaluate((el: Element) => el.classList.contains('disabled'));

          if (!isNextDisabled && remainingPages > 1) {
            return scrapperOnly(currentPage + 1, remainingPages - 1);
          }
        } catch (error) {
          log.debug(`Error on page ${currentPage}`, error);
          await job.log(`Error on page ${currentPage}: ${error}`);
          await job.progress(progressCalculate(totalPages, remainingPages));
          return scrapperOnly(currentPage + 1, remainingPages - 1);
        }
        await job.progress(100);
        await browser.close();
        return Promise.resolve(productsInfo);
      }

      return scrapperOnly(pageNumber, totalPages);
    } catch (error) {
      const errorMessage = `Error initializing scraping: ${error}`;
      this._log.error(errorMessage);
      await job.log(errorMessage);
      await browser.close();
      return Promise.reject(error);
    }
  }

  public async fetchProductDetails(url: string, job: IJobContext<{ url: string }[]>): Promise<IProductDetails | null> {
    this._log.debug(`Fetching product deatail at URL: ${url}`);

    if (!url) throw new InvalidParameterError('url');

    puppeteer.use(StealthPlugin());
    const browser = await puppeteer.launch(CONFIG);

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TIME_OUT);
      page.setViewport(VIEW_PORT);

      const response = await page.goto(url, { waitUntil: 'networkidle2' });

      if (response?.status() !== 200) {
        const message = `Failed to load page: ${url} with status ${response?.status()}`;
        this._log.debug(message);
        await job.log(message);
        throw new PageLoadError(response?.status(), url);
      }

      await page.waitForSelector('div.bzsCgK');
      let views = 0;
      let location = { state: '' };
      let seller = { name: '', whatsapp: '', phone: '', email: '' };
      const [viewsAndLocationContainer, sellerAndContactContainer] = await Promise.all([page.$('div.bzsCgK'), page.$('div.fmEzaW')]);

      if (!viewsAndLocationContainer && !sellerAndContactContainer) {
        this._log.warn('Page structure unexpected: missing views/location or seller/contact container');
        return null;
      }

      if (viewsAndLocationContainer) {
        const [viewsParagraph, locationParagraph] = await Promise.all([
          viewsAndLocationContainer.$('p.cZACiy'),
          viewsAndLocationContainer.$('p[data-cy="adLocation"]'),
        ]);

        const [rawViews, rawLocation] = await Promise.all([
          viewsParagraph?.evaluate((element: Element) => element.textContent?.trim() || ''),
          locationParagraph?.evaluate((element: Element) => element.textContent?.trim() || ''),
        ]);

        views = rawViews ? parseViews(rawViews) : 0;
        location = rawLocation ? parseLocation(rawLocation) : location;
      }

      if (sellerAndContactContainer) {
        const [sellerNameParagraph, whatsappElement, phoneElement, emailElement] = await Promise.all([
          sellerAndContactContainer.$('p[data-cy="adName"]'),
          sellerAndContactContainer.$('a[href^="https://wa.me/"]'),
          sellerAndContactContainer.$('a[href^="tel:"]'),
          sellerAndContactContainer.$('a[href^="mailto:"]'),
        ]);

        const [rawSellerName, rawWhatsapp, rawPhone, rawEmail] = await Promise.all([
          sellerNameParagraph?.evaluate((element: Element) => element.textContent?.trim() || '') ?? '',
          whatsappElement?.evaluate((element: Element) => {
            const href = element.getAttribute('href');
            return href ? href.split('?')[0]?.split('/').pop() || '' : '';
          }) ?? '',
          phoneElement?.evaluate((element: Element) => {
            const href = element.getAttribute('href');
            return href ? href.split(':')?.pop() || '' : '';
          }) ?? '',
          emailElement?.evaluate((element: Element) => {
            const href = element.getAttribute('href');
            return href ? href.split(':')?.pop() || '' : '';
          }) ?? '',
        ]);

        seller = { name: rawSellerName.trim(), email: rawEmail.trim(), whatsapp: rawWhatsapp.trim(), phone: rawPhone.trim() };
      }

      return { views, location, seller };
    } catch (error) {
      const errorMessage = `Error initializing scraping: ${error}`;
      this._log.error(errorMessage);
      await job.log(errorMessage);
      return Promise.reject(error);
    } finally {
      await browser.close();
    }
  }
}
