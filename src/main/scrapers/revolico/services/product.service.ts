import { QContext } from '@config/queue.config';
import { BullBoardService } from '@shared/bull-board';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { Job, JobId } from 'bull';
import { inject, injectable } from 'inversify';
import { IRevolicoProduct } from '../models/product.model';
import { CustomInsertManyResult, ProductRepository } from '../repositories/product.repository';
import { QUEUE_NAME } from '../utils/constants';
import { ScrapingProductService } from './scraping-product.service';
import { ScrapingProductType } from './dto';

@injectable()
export class ProductService {
  constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(QContext) private readonly _qContext: QContext,
    @inject(BullBoardService) private readonly _bullBoardService: BullBoardService,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(ScrapingProductService) private readonly _scrapingproductService: ScrapingProductService,
  ) {
    this._log.context = ProductService.name;
  }

  /**
   *
   * @returns
   */
  public async getAll(): Promise<string[]> {
    this._log.debug('Request to get all products');
    return ['Product 1', 'Product 2'];
  }

  public async getById(id: string): Promise<string> {
    this._log.debug(`Request to get product by id: ${id}`);
    return `Product ${id}`;
  }

  public async search(id: string): Promise<string> {
    this._log.debug(`Request to get product by id: ${id}`);
    return `Product ${id}`;
  }

  /**
   * Processes the storage job by saving the provided products to the database.
   * It extracts the product data from the job, passes it to the ProductService,
   * and logs the result.
   *
   * @param {Job<IRevolicoProduct[]>} job - The job object containing an array of products to be processed.
   * @returns {Promise<IRevolicoProduct[]>} - The result of saving the products to the database.
   * @throws {Error} - Throws an error if the job processing fails.
   */
  async processStorageJobs(job: Job<IRevolicoProduct[]>): Promise<Array<string>> {
    this._log.debug(`Processing scraping job ID(${job.id})`);

    try {
      const { data } = job;
      const result = await this.createMany(data);
      this._log.info(`Successfully saved ${result.length} products to database`);
      job.log(`Successfully saved ${result.length} products to database`);
      job.progress(100);
      return result;
    } catch (error) {
      this._log.error(`Failed to process job with id: ${job.id}`, error);
      job.log('Failed to save data to database');
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
    this._log.debug('Request to add a product data storage job.');
    await this._qContext.QCreate(queueName, this.processStorageJobs.bind(this));
    try {
      this.setupQueueListeners();
      this._bullBoardService.addQueueForMonitoring(queueName);

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

  /**
   * Saves multiple products to the database using the repository.
   * Logs the outcome and handles any errors during the operation.
   *
   * @param {IRevolicoProduct[]} products - Array of products to be saved.
   * @returns {Promise<IRevolicoProduct[]>} - The array of saved products returned from the database.
   * @throws {Error} - Throws an error if the saving process fails.
   */
  async createMany(products: IRevolicoProduct[], rawResult: boolean = true): Promise<Array<string>> {
    try {
      this._log.debug('Request to create many product documents.');
      const result = await this._repository.createMany(products, { rawResult });
      if ('acknowledged' in result && result.acknowledged && result.insertedIds) {
        return Object.values(result.insertedIds);
      }
      return (result as IRevolicoProduct[]).map((product: IRevolicoProduct) => product._id?.toString()).filter((id): id is string => !!id);
    } catch (error) {
      this._log.error('Failed to save products to database', error);
      throw error;
    }
  }

  private setupQueueListeners() {
    const storageQueue = this._qContext.getQueue(QUEUE_NAME.product_storage);
    storageQueue.on('completed', async (job: Job<IRevolicoProduct[]>, result: IRevolicoProduct[]) => {
      this._log.debug(`Scheduling batches of product detail retrieval`);

      const productData = result.map(product => ({ id: product._id, url: product.url }) as ScrapingProductType);

      const batchSize = Number(process.env.BATCHSIZE_PRODUCT_URLS) || 20;
      let batchNumber = 0;
      for (let i = 0; i < productData.length; i += batchSize) {
        const batch = productData.slice(i, i + batchSize);

        await this._scrapingproductService.addScrapingJob(batch, QUEUE_NAME.product_scraping);
        this._log.info(`Scheduled batch of ${batch.length} product URLs for scraping`);
        batchNumber++;
      }
      this._log.info(`Created ${batchNumber} batches of product URLs for scraping`);
    });
  }
}
