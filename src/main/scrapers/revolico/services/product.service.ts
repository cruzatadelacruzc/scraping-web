import { QContext } from '@config/queue.config';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { Job, JobId } from 'bull';
import { inject, injectable } from 'inversify';
import { IRevolicoProduct } from '../models/product.model';
import { ProductRepository } from '../repositories/product.repository';
import { QUEUE_NAME } from '../queues';
import { ScrapingProductService } from './scraping-product.service';
import { InvalidProductInfoError } from '../errors/invalid-product-data.error';


@injectable()
export class ProductService {
  constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(QContext) private readonly _qContext: QContext,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(TYPES.ScrapingOneProduct) private readonly _scrapingproductService: ScrapingProductService,
  ) {
    this._log.context = ProductService.name;
  }

  /**
   * Inserts or updates a list of products in the database. The list contains
   * product objects with their respective information. The method returns
   * an object with three properties: urls (an array of strings containing
   * the URLs of the products that were successfully inserted or updated),
   * invalidProductInfo (an array of product objects containing the products
   * that were not inserted or updated due to invalid product information),
   * and errors (an array of strings containing the error messages for the
   * products that were not inserted or updated).
   *
   * @param {IRevolicoProduct[]} batchProducts - An array of product objects
   * containing the products to be inserted or updated in the database.
   * @returns {Promise<{ urls: string[]; invalidProductInfo: IRevolicoProduct[]; errors: Error[] }>}
   */
  async bulkAddOrEditUrls(
    batchProducts: IRevolicoProduct[],
  ): Promise<{ urls: string[]; errors: Error[]; invalidProductInfo: IRevolicoProduct[] }> {
    this._log.debug(`Bulk insert or update request for ${batchProducts.length} products`);

    const processedUrls: string[] = [];
    const errors: Error[] = [];
    const invalidProductInfo: IRevolicoProduct[] = [];

    const productsPromises = batchProducts.map(product =>
      this._repository.bulkInsertOrUpdate(product, ['url']).then(
        result => {
          if (result?.url) {
            processedUrls.push(result.url);
          }
        },
        error => {
          Object.values(error.errors).forEach((err: any) => err && err.message && errors.push(err.message));
          this._log.warn(`Failed to process product with URL: ${product.url}`);
          invalidProductInfo.push(product);
        },
      ),
    );

    await Promise.allSettled(productsPromises);

    return { urls: processedUrls, invalidProductInfo, errors };
  }

  /**
   * Processes the storage job by saving the provided products to the database.
   * It extracts the product data from the job, passes it to the ProductService,
   * and logs the result.
   *
   * @param {Job<IRevolicoProduct[]>} job - The job object containing an array of products to be processed.
   * @returns {Promise<{ id: string }[]>} - The result of saving the products Id to the database.
   * @throws {Error} - Throws an error if the job processing fails.
   */
  async processor(job: Job<IRevolicoProduct[]>): Promise<{ url: string }[]> {
    this._log.debug(`Processing scraping job ID(${job.id})`);

    try {
      const { data } = job;
      const result = await this.bulkAddOrEditUrls(data);
      
      if (result.errors.length > 0) {
        const errorLogs = result.errors.map(err => job.log(err.toString()));
        await Promise.allSettled(errorLogs);
      }

      if (result.invalidProductInfo.length > 0) {
        throw new InvalidProductInfoError(result.invalidProductInfo);
      }

      job.log(`Successfully saved ${result.urls.length} products to database`);
      job.progress(100);     

      return result.urls.map(url => ({ url }));
    } catch (error) {
      job.log('🔥 Failed to save data to database 🔥');
      error instanceof InvalidProductInfoError && job.update(error.invalidProductsInfo);            
      throw error;
    }
  }

  /**
   * Adds a new storage product data job to the queue.
   *
   * @param {JobSchemaType} data - The data for the scraping job.
   * @returns {Promise<JobId>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  async addStorageDataJob(data: IRevolicoProduct[], queueName: string): Promise<JobId> {
    try {
      this.setupQueueListeners();

      const createdJob = await this._qContext.getQueue(queueName).add(data, {
        attempts: 3,
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

  private setupQueueListeners() {
    const storageQueue = this._qContext.getQueue(QUEUE_NAME.product_storage);
    storageQueue.on('completed', async (job: Job<IRevolicoProduct[]>, result: { url: string }[]) => {
      const batchSize = Number(process.env.PRODUCT_URLS_BATCHSIZE) || 30;

      for (let i = 0; i < result.length; i += batchSize) {
        const batch = result.slice(i, i + batchSize);

        await this._scrapingproductService.addScrapingJob(batch, QUEUE_NAME.product_scraping);
        this._log.debug(`Scheduled batch of ${batch.length} product URLs for scraping`);
      }
    });
  }
}
