import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
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
    @inject(QueueContext) private readonly _qContext: QueueContext,
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

  public async processor(ctx: IJobContext<IRevolicoProduct[]>): Promise<{ url: string }[]> {
    this._log.debug(`Processing scraping job ID(${ctx.id})`);

    try {
      const { data } = ctx;
      const result = await this.bulkAddOrEditUrls(data);

      if (result.errors.length > 0) {
        const errorLogs = result.errors.map(err => ctx.log(err.toString()));
        await Promise.allSettled(errorLogs);
      }

      if (result.invalidProductInfo.length > 0) {
        throw new InvalidProductInfoError(result.invalidProductInfo);
      }

      await ctx.log(`Successfully saved ${result.urls.length} products to database`);
      await ctx.progress(100);

      return result.urls.map(url => ({ url }));
    } catch (error) {
      await ctx.log('Failed to save data to database');
      if (error instanceof InvalidProductInfoError) {
        // Bull had a private `job.update(...)` method; in BullMQ the
        // standard way to surface structured failures is via the
        // processor throwing, and the listener can read the returned
        // value. We keep the invalid products info in the error message
        // and re-throw so the failure is still observable.
        await ctx.log(`Invalid products: ${JSON.stringify(error.invalidProductsInfo)}`);
      }
      throw error;
    }
  }

  public async addStorageDataJob(data: IRevolicoProduct[], queueName: string): Promise<string> {
    try {
      const jobId = await this._qContext.enqueue(queueName, data, {
        attempts: 3,
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

  /**
   * Listens for the completed event on the product storage queue.
   * When a job is completed, evaluates alarms and schedules scraping jobs.
   */
  public setupQueueListeners(): void {
    const adapter = this._qContext.getAdapter();
    adapter.onCompleted<{ url: string }[]>(QUEUE_NAME.product_storage, async ({ data, result }) => {
      const products = (data as IRevolicoProduct[] | undefined) ?? [];
      const stored = result ?? [];

      this._log.debug(`Storage completed event received: ${stored.length} products stored. Scheduling scraping jobs.`);

      // Evaluate alarms with the stored products (non-blocking)
      const snapshots: IProductSnapshot[] = products
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

      for (let i = 0; i < stored.length; i += batchSize) {
        const batch = stored.slice(i, i + batchSize);

        await this._scrapingproductService.addScrapingJob(batch, QUEUE_NAME.product_scraping);
        this._log.debug(`Scheduled batch of ${batch.length} product URLs for scraping`);
      }
    });
  }
}
