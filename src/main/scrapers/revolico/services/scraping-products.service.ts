import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { injectable, inject } from 'inversify';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { ProductService } from './product.service';
import { QUEUE_NAME } from '../queues';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';

@injectable()
export class ScrapingProductsService {
  public constructor(
    @inject(QueueContext) private _qContext: QueueContext,
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
   * @param {IJobContext<ScrapingProductsType>} ctx - Backend-agnostic job context.
   * @returns {Promise<IRevolicoProduct[]>} - The result of fetching the products data from Revolico.
   * @throws {Error} - Throws an error if the job processing fails.
   */
  public async processor(ctx: IJobContext<ScrapingProductsType>): Promise<IRevolicoProduct[]> {
    this._log.debug(`Processing scraping job ID(${ctx.id}) with data: `, ctx.data);
    const { category, subcategory, pageNumber, totalPages } = ctx.data;
    try {
      const data = await this._revolicoProductData.fetchProductInfoByCategory<IRevolicoProduct>(
        category,
        subcategory,
        pageNumber,
        totalPages,
        ctx,
      );
      const logMsg = `Processed products qty: ${data.length}`;
      this._log.debug(logMsg);
      await ctx.log(logMsg);
      return data;
    } catch (error) {
      this._log.error(`Failed to process job with id: ${ctx.id}`, error);
      await ctx.log(`Product data retrieval and storage failed`);
      throw error;
    }
  }

  /**
   * Adds a new scraping job to the queue.
   *
   * @param {ScrapingProductsType} data - The data for the products scraping job.
   * @returns {Promise<string>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  public async addScrapingJob(data: ScrapingProductsType, queueName: string): Promise<string> {
    try {
      const jobId = await this._qContext.enqueue(queueName, data, {
        attempts: 2, // Retry twice if it fails
        backoff: 5000, // Optional: wait 5 seconds between retries
      });

      this._log.debug(`Job ID: ${jobId} added to the "${queueName}" queue`);
      return jobId;
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
  public setupQueueListeners(): void {
    const adapter = this._qContext.getAdapter();
    adapter.onCompleted<IRevolicoProduct[]>(QUEUE_NAME.products_scraping, async ({ result }) => {
      if (!result) return;
      this._log.debug(`Completed event received: ${result.length} products data scraped. Scheduling storing jobs.`);

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
