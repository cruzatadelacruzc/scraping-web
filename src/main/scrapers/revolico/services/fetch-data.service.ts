import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import { CONFIG, TIME_OUT, VIEW_PORT } from '@utils/puppeteer.utils';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { inject, injectable } from 'inversify';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { buildFullUrl, parseCost, parseLocation, parseViews } from '@utils/normalize-data.util';
import { Job } from 'bull';
import { ScrapingProductsType } from './dto';
import { PageLoadError } from '../errors/page-load.error';
import { progressCalculate } from '@utils/queue.util';
import { extractDataFromUrl } from '../utils/extract-data.util';
import { IProductDetails } from '@shared/product-base.interfaces';

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

  public async fetchProductInfoByCategory<IRevolicoProduct>(
    category: string,
    subcategory: string,
    pageNumber: number = 1,
    totalPages: number = 100,
    job: Job<ScrapingProductsType>,
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
            return scrapperOnly(currentPage + 1, remainingPages - 1);
          }

          await Promise.all([page.waitForSelector('div.ybloC'), page.waitForSelector('a#paginator-next')]);

          const productsContainer = await page.$('div.ybloC');
          if (productsContainer) {
            const uls = await productsContainer.$$('ul');
            for (const ul of uls) {
              const lis = await ul.$$('li');
              await Promise.all(
                lis.map(async li => {
                  const [elememntlink, elememntCost, elememntDescription, elememntImage, elememntOutstanding] = await Promise.all([
                    li.$('a'),
                    li.$('span'),
                    li.$('p'),
                    li.$('picture img'),
                    li.$('div.dHRSzq'),
                  ]);

                  const [pathItemProduct, cost, description, imageURL, isOutstanding] = await Promise.all([
                    elememntlink?.evaluate(element => element.getAttribute('href')?.trim()),
                    elememntCost?.evaluate(element => element.textContent?.trim()),
                    elememntDescription?.evaluate(element => element.textContent?.trim() || ''),
                    elememntImage?.evaluate(element => element.getAttribute('src')?.trim()),
                    elememntOutstanding?.evaluate(element => !!element) ?? false,
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

          job.progress(progressCalculate(totalPages, remainingPages));
          await job.log(`Number of products processed on page (${currentPage}) : ${productQtyPage}`);

          // Check if next page exists
          const nextButton = await page.$('a#paginator-next');
          const isNextDisabled = await nextButton?.evaluate(el => el.classList.contains('disabled'));

          if (!isNextDisabled && remainingPages > 1) {
            return scrapperOnly(currentPage + 1, remainingPages - 1);
          }
        } catch (error) {
          log.debug(`Error on page ${currentPage}`, error);
          job.log(`Error on page ${currentPage}: ${error}`);
          job.progress(progressCalculate(totalPages, remainingPages));
          return scrapperOnly(currentPage + 1, remainingPages - 1);
        }
        await job.progress(100);

        return Promise.resolve(productsInfo);
      }

      return scrapperOnly(pageNumber, totalPages);
    } catch (error) {
      const errorMessage = `Error initializing scraping: ${error}`;
      this._log.error(errorMessage);
      job.log(errorMessage);
      return Promise.reject(error);
    } finally {
      await browser.close();
    }
  }

  public async fetchProductDetails(url: string, job: Job<{ url: string }[]>): Promise<IProductDetails> {
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

      if (viewsAndLocationContainer) {
        const [viewsParagraph, locationParagraph] = await Promise.all([
          viewsAndLocationContainer.$('p.cZACiy'),
          viewsAndLocationContainer.$('p[data-cy="adLocation"]'),
        ]);

        const [rawViews, rawLocation] = await Promise.all([
          viewsParagraph?.evaluate(element => element.textContent?.trim() || ''),
          locationParagraph?.evaluate(element => element.textContent?.trim() || ''),
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
          sellerNameParagraph?.evaluate(element => element.textContent?.trim() || '') ?? '',
          whatsappElement?.evaluate(element => {
            const href = element.getAttribute('href');
            return href ? href.split('?')[0]?.split('/').pop() || '' : '';
          }) ?? '',
          phoneElement?.evaluate(element => {
            const href = element.getAttribute('href');
            return href ? href.split(':')?.pop() || '' : '';
          }) ?? '',
          emailElement?.evaluate(element => {
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
      job.log(errorMessage);
      return Promise.reject(error);
    } finally {
      await browser.close();
    }
  }
}
