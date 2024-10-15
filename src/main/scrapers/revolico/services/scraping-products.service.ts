import { QContext } from '@config/queue.config';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { injectable, inject } from 'inversify';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { Job, JobId } from 'bull';
import { ProductService } from './product.service';
import { QUEUE_NAME } from '../queues';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

@injectable()
export class ScrapingProductsService {
  constructor(
    @inject(QContext) private _qContext: QContext,
    @inject(TYPES.ProductService) private _productService: ProductService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.RevolicoData) private readonly _revolicoProductData: IFetchProductData,
  ) {
    this._log.context = ScrapingProductsService.name;    
  }

  /**
   * Processes the scraping job by fetching products data from Revolico.
   * It extracts the product data from the job, passes it to the IFetchProductData,
   * and logs the result.
   *
   * @param {Job<ScrapingProductsType>} job - The job object containing an array of products to be processed.
   * @returns {Promise<IRevolicoProduct[]>} - The result of fetching the products data from Revolico.
   * @throws {Error} - Throws an error if the job processing fails.
   */
  async processor(job: Job<ScrapingProductsType>): Promise<IRevolicoProduct[]> {
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
      const logMsg = `Processed products qty: ${data.length}`;
      this._log.debug(logMsg);
      job.log(logMsg);            
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
    try {
      this.setupQueueListeners();

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

  /**
   * Listens for the completed event on the products scraping queue.
   * When a job is completed, it schedules a job to store the product data.
   */
  private setupQueueListeners() {
    const manyProductQueue = this._qContext.getQueue(QUEUE_NAME.products_scraping);
    manyProductQueue.on('completed', async (job: Job<IRevolicoProduct[]>, result: IRevolicoProduct[]) => {
      
      const batchSize = Number(process.env.PRODUCT_STORAGE_BATCHSIZE) || 50;
      const totalBatches = Math.ceil(result.length / batchSize);

      for (let i = 0; i < totalBatches; i++) {
        const batch = result.slice(i * batchSize, (i + 1) * batchSize);

        await this._productService.addStorageDataJob(batch, QUEUE_NAME.product_storage);

        this._log.debug(`Scheduled batch of ${batch.length} products for storage`);
      }
    });
  }
}
