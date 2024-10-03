import { QContext } from '@config/queue.config';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { injectable, inject } from 'inversify';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { BullBoardService } from '@shared/bull-board';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { Job, JobId } from 'bull';
import { ProductService } from './product.service';
import { QUEUE_NAME } from '../utils/constants';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

@injectable()
export class ScrapingProductsService {
  constructor(
    @inject(QContext) private _qContext: QContext,
    @inject(BullBoardService) private _bullBoardService: BullBoardService,
    @inject(ProductService) private _productService: ProductService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.RevolicoData) private readonly _revolicoProductData: IFetchProductData,
  ) {
    this._log.context = ScrapingProductsService.name;
  }

  /**
   *
   * @param job
   * @returns
   */
  async processJobs(job: Job<ScrapingProductsType>) {
    this._log.debug(`Processing scraping job ID(${job.id}) with data: `, job.data);
    const { category, subcategory, pageNumber, totalPages } = job.data;
    try {
      const data = await this._revolicoProductData.fetchProductInfoByCategory<IRevolicoProduct>(
        category,
        subcategory,
        pageNumber,
        totalPages,
        job,
      );
      const processedAmount = data.length;
      const logMsg = `Processed products qty: ${processedAmount}`;
      this._log.debug(logMsg);
      job.log(logMsg);
      data.length && (await this._productService.addStorageDataJob(data, QUEUE_NAME.product_storage));
      return data;
    } catch (error) {
      this._log.error(`Failed to process job with id: ${job.id}`, error);
      job.log(`Product data retrieval and storage failed`);
      throw error;
    }
  }

  /**
   * Adds a new scraping job to the queue.
   *
   * @param {ScrapingProductsType} data - The data for the products scraping job.
   * @returns {Promise<JobId>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  async addScrapingJob(data: ScrapingProductsType, queueName: string): Promise<JobId> {
    await this._qContext.QCreate(queueName, this.processJobs.bind(this));
    try {
      this._bullBoardService.addQueueForMonitoring(queueName);

      const createdJob = await this._qContext.getQueue(queueName).add(data, {
        attempts: 2, // Retry twice if it fails
        backoff: 5000, // Optional: wait 5 seconds between retries
      });

      this._log.debug(`Job ID: ${createdJob.id} added to the "${queueName}" queue`);
      return createdJob.id;
    } catch (error) {
      let message = `Failed to add job to the "${queueName}" queue`;
      if (error instanceof Error) message = `Failed to add job to the "${queueName}" queue: ${error.message}`;
      this._log.error(message);
      throw error;
    }
  }
}
