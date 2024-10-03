import { QContext } from '@config/queue.config';
import { BullBoardService } from '@shared/bull-board';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { Job, JobId } from 'bull';
import { inject, injectable } from 'inversify';
import { ScrapingProductType } from './dto/scraping-product.dto';
import { ProductRepository } from '../repositories/product.repository';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { delayRandom } from '@utils/puppeteer.utils';
import { progressCalculate } from '@utils/queue.util';

@injectable()
export class ScrapingProductService {
  constructor(
    @inject(QContext) private _qContext: QContext,
    @inject(BullBoardService) private _bullBoardService: BullBoardService,
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
   * @param {Job<Array<ScrapingProductType>>} job - Bull job containing an array of product IDs for scraping.
   * @returns {Promise<string>} - A message indicating how many product URLs were processed.
   * @throws Will throw an error if scraping or updating a product fails.
   */
  async processJob(job: Job<Array<ScrapingProductType>>): Promise<string> {
    const productsData = job.data;
    this._log.debug(`Processing scraping job for ${productsData?.length} product URLs`);
    let url;
    let remaining = productsData.length;
    for (const { id } of productsData) {
      try {
        const product = await this._repository.findOne(id);

        if (!product) {
          const warnMessage = `Product with ID ${id} not found`;
          this._log.warn(warnMessage);
          await job.log(warnMessage);
          continue;
        }

        url = product.url;
        const productDetails = await this._revolicoProductData.fetchProductDetails(url, job);

        await this._repository.update(id, productDetails);
        job.log(`Successfully scraped and updated product(${id}) at URL: ${url}`);

        remaining--;
        await job.progress(progressCalculate(productsData.length, remaining));

        // Delay the next request to avoid triggering rate limits
        delayRandom(1000, 3000);
      } catch (error) {
        this._log.error(`Failed to scrape product data for URL: ${url}`, error);
        job.log(`Product data retrieval and storage failed`);
        throw error;
      }
    }

    return `Processed ${productsData.length} product URLs`;
  }

  /**
   * Adds a new product info scraping job to the queue.
   *
   * @param {Array<ScrapingProductType>} data - The data for the product scraping job.
   * @returns {Promise<JobId>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  async addScrapingJob(data: ScrapingProductType[], queueName: string): Promise<JobId> {
    await this._qContext.QCreate(queueName, this.processJob.bind(this));
    try {
      this._bullBoardService.addQueueForMonitoring(queueName);

      const createdJob = await this._qContext.getQueue(queueName).add(data, {
        attempts: 2,
        backoff: 5000,
      });

      this._log.info(`Job ID: ${createdJob.id} added to the "${queueName}" queue`);
      return createdJob.id;
    } catch (error) {
      let message = `Failed to add job to the "${queueName}" queue`;
      if (error instanceof Error) message = `Failed to add job to the "${queueName}" queue: ${error.message}`;
      this._log.error(message);
      throw error;
    }
  }
}
