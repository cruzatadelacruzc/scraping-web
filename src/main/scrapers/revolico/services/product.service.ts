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
import { AlarmEngineService } from '@alarms/services/alarm-engine.service';
import { IProductSnapshot } from '@alarms/conditions/condition.interface';

@injectable()
export class ProductService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(QContext) private readonly _qContext: QContext,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(TYPES.ScrapingOneProduct) private readonly _scrapingproductService: ScrapingProductService,
    @inject(TYPES.AlarmEngineService) private readonly _alarmEngine: AlarmEngineService,
  ) {
    this._log.context = ProductService.name;
  }

  public async bulkAddOrEditUrls(
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

  public async processor(job: Job<IRevolicoProduct[]>): Promise<{ url: string }[]> {
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
      job.log('Failed to save data to database');
      if (error instanceof InvalidProductInfoError) {
        job.update(error.invalidProductsInfo);
      }
      throw error;
    }
  }

  public async addStorageDataJob(data: IRevolicoProduct[], queueName: string): Promise<JobId> {
    try {
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
   * Listens for the completed event on the product storage queue.
   * When a job is completed, evaluates alarms and schedules scraping jobs.
   */
  public setupQueueListeners(): void {
    const storageQueue = this._qContext.getQueue(QUEUE_NAME.product_storage);
    storageQueue.on('completed', async (job: Job<IRevolicoProduct[]>, result: { url: string }[]) => {
      this._log.debug(`Job ${job.id} completed: ${result.length} products stored. Scheduling scraping jobs.`);

      // Evaluate alarms with the stored products (non-blocking)
      const snapshots: IProductSnapshot[] = (job.data || [])
        .filter(p => p.url && p.price != null)
        .map(p => ({
          url: p.url,
          price: p.price,
          currency: p.currency || 'USD',
          views: p.views ?? 0,
          isOutstanding: p.isOutstanding ?? false,
          seller: {
            name: p.seller?.name,
            phone: p.seller?.phone,
            email: p.seller?.email,
            whatsapp: p.seller?.whatsapp,
          },
          location: {
            state: p.location?.state ?? '',
            municipality: p.location?.municipality,
          },
          priceHistory: (p.priceHistory || []).map(h => ({ value: h.value, updatedAt: h.updatedAt })),
        }));
      if (snapshots.length) {
        this._alarmEngine.evaluateAlarms(snapshots).catch(err => this._log.error('Alarm engine evaluation failed', err));
      }

      const batchSize = Number(process.env.PRODUCT_URLS_BATCHSIZE) || 30;

      for (let i = 0; i < result.length; i += batchSize) {
        const batch = result.slice(i, i + batchSize);

        await this._scrapingproductService.addScrapingJob(batch, QUEUE_NAME.product_scraping);
        this._log.debug(`Scheduled batch of ${batch.length} product URLs for scraping`);
      }
    });
  }
}
