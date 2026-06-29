import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { injectable, inject } from 'inversify';
import { ScrapingProductsType } from '@scrapers/revolico/services/dto';
import { IRevolicoProduct } from '@scrapers/revolico/models/product.model';
import { ProductService } from './product.service';
import { QUEUE_NAME } from '../queues';

@injectable()
export class ScrapingProductsService {
  public constructor(
    @inject(QueueContext) private _qContext: QueueContext,
    @inject(TYPES.ProductService) private _productService: ProductService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScrapingProductsService.name;
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
