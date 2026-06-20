import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { inject, injectable } from 'inversify';
import { ProductRepository } from '../repositories/product.repository';
import { IFetchProductData } from '@shared/fetch-product-data.interface';
import { delayRandom } from '@utils/puppeteer.utils';
import { progressCalculate } from '@utils/queue.util';

@injectable()
export class ScrapingProductService {
  public constructor(
    @inject(QueueContext) private readonly _qContext: QueueContext,
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(TYPES.RevolicoData) private readonly _revolicoProductData: IFetchProductData,
  ) {
    this._log.context = ScrapingProductService.name;
  }

  /**
   * Processes a job containing product IDs, retrieves additional product details,
   * and updates each product with the fetched information.
   *
   * @param {IJobContext<{url: string}[]>} ctx - Backend-agnostic job context.
   * @returns {Promise<string>} - A message indicating how many product URLs were processed.
   * @throws Will throw an error if scraping or updating a product fails.
   */
  public async processor(ctx: IJobContext<{ url: string }[]>): Promise<string> {
    const productsData = ctx.data;
    this._log.debug(`Processing scraping job for ${productsData?.length} product URLs`);
    let remaining = productsData.length;
    for (const { url } of productsData) {
      try {
        const product = await this._repository.findOne({ url }, { _id: 1 });

        if (!product?._id) {
          const warnMessage = `Product with URL ${url} not found`;
          this._log.warn(warnMessage);
          await ctx.log(warnMessage);
          continue;
        }

        const productDetails = await this._revolicoProductData.fetchProductDetails(url, ctx);
        if (!productDetails) {
          const warnMessage = `Failed to fetch product details for URL: ${url}`;
          this._log.warn(warnMessage);
          await ctx.log(warnMessage);
          continue;
        }

        await this._repository.update(product._id, productDetails);
        await ctx.log(`Successfully scraped and updated product(${product._id}) at URL: ${url}`);

        remaining--;
        await ctx.progress(progressCalculate(productsData.length, remaining));

        // Delay the next request to avoid triggering rate limits
        delayRandom(1000, 3000);
      } catch (error) {
        this._log.error(`Failed to scrape product data for URL: ${url}`, error);
        await ctx.log(`Product data retrieval and storage failed`);
        throw error;
      }
    }

    return `Processed ${productsData.length} product URLs`;
  }

  /**
   * Adds a new product info scraping job to the queue.
   *
   * @param {Array<{url: string}>} data - The data for the product scraping job.
   * @returns {Promise<string>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  public async addScrapingJob(data: { url: string }[], queueName: string): Promise<string> {
    try {
      const jobId = await this._qContext.enqueue(queueName, data, {
        attempts: 2,
        backoff: 5000,
      });

      this._log.info(`Job ID: ${jobId} added to the "${queueName}" queue`);
      return jobId;
    } catch (error) {
      let message = `Failed to add job to the "${queueName}" queue`;
      if (error instanceof Error) message = `Failed to add job to the "${queueName}" queue: ${error.message}`;
      this._log.error(message);
      throw error;
    }
  }
}
