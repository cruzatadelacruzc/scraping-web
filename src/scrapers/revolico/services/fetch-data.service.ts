import { InvalidParameterError } from '@scrapers/revolico/errors/invalid-parameter.error';
import { CONFIG, TIME_OUT, VIEW_PORT } from '@utils/puppeteer.utils';
import puppeteer from 'puppeteer';
import { inject, injectable } from 'inversify';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';

@injectable()
export class RevolicoFetchDataService implements IFetchProductData {
  private _baseURL: string;

  constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._baseURL = 'https://www.revolico.com/search';
  }

  buildURL(category: string, subcategory: string, pageNumber: number): string {
    const params = [`category=${category}`, subcategory && `subcategory=${subcategory}`, pageNumber && `page=${pageNumber}`]
      .filter(Boolean)
      .join('&');

    const url = `${this._baseURL}?${params}`;
    this._log.debug(`Fetching products from: ${url}`);
    return url;
  }

  public async fetchProductInfoByCategory<IRevolicoProduct>(
    category: string,
    subcategory: string,
    pageNumber: number = 1,
    totalPages: number = 100,
  ): Promise<IRevolicoProduct[]> {
    this._log.debug(`Fetching products info from category: ${category}, subcategory: ${subcategory}, page: ${pageNumber}`);

    if (!category) throw new InvalidParameterError('category');

    const productsInfo: IRevolicoProduct[] = [];
    const buildURL = this.buildURL.bind(this);
    const log = this._log;

    if (pageNumber <= 0 || totalPages <= 0) return productsInfo;

    const browser = await puppeteer.launch(CONFIG);

    try {
      const page = await browser.newPage();
      page.setDefaultTimeout(TIME_OUT);
      page.setViewport(VIEW_PORT);

      async function scrapperOnly(currentPage: number, remainingPages: number, data: IRevolicoProduct[] = []): Promise<IRevolicoProduct[]> {
        if (remainingPages <= 0) {
          return Promise.resolve(data);
        }

        const url = buildURL(category, subcategory, currentPage);
        try {
          const response = await page.goto(url, { waitUntil: 'networkidle2' });

          if (response?.status() !== 200) {
            log.debug(`Failed to load page: ${url} with status ${response?.status()}`);
            return scrapperOnly(currentPage + 1, remainingPages - 1);
          }

          const productsContainer = await page.$('div.ybloC');
          if (productsContainer) {
            const uls = await productsContainer.$$('ul');
            for (const ul of uls) {
              const lis = await ul.$$('li');
              for (const li of lis) {
                const elememntlink = await li.$('a');
                const elememntCost = await li.$('span');
                const elememntDescription = await li.$('p');
                const elememntImage = await li.$('picture img');

                const url = await elememntlink?.evaluate(element => element.getAttribute('href')?.trim());
                const cost = await elememntCost?.evaluate(element => element.textContent?.trim());
                const description = await elememntDescription?.evaluate(element => element.textContent?.trim() || '');
                const imageURL = await elememntImage?.evaluate(element => element.getAttribute('src')?.trim());

                if (url && cost && imageURL !== null) {
                  productsInfo.push({ url, cost, description, imageURL } as IRevolicoProduct);
                }
              }
            }
          }

          // Check if next page exists
          const nextButton = await page.$('a#paginator-next');
          const isNextDisabled = await nextButton?.evaluate(el => el.classList.contains('disabled'));

          if (!isNextDisabled && remainingPages > 1) {
            return scrapperOnly(currentPage + 1, remainingPages - 1, productsInfo);
          }
        } catch (error) {
          log.debug(`Error on page ${currentPage}: ${error}`);
          return scrapperOnly(currentPage + 1, remainingPages - 1);
        }
        return Promise.resolve(productsInfo);
      }

      return scrapperOnly(pageNumber, totalPages);
    } catch (error) {
      this._log.error(`Error initializing scraping: ${error}`);
      return Promise.reject(error);
    } finally {
      await browser.close();
    }
  }
}
