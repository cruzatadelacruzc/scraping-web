import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { inject, injectable } from 'inversify';
import crypto from 'crypto';
import { IRevolicoProduct } from '../models/product.model';
import { ProductRepository } from '../repositories/product.repository';
import { QUEUE_NAME } from '../queues';
import { ScrapingProductService } from './scraping-product.service';
import { InvalidProductInfoError } from '../errors/invalid-product-data.error';
import { AlarmEngineService } from '@alarms/services/alarm-engine.service';
import { IProductSnapshot } from '@alarms/conditions/condition.interface';
import { AnalyticsService } from '@scrapers/revolico/services/analytics.service';
import { AttributeExtractorService } from '@scrapers/services/attribute-extractor/attribute-extractor.service';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';

@injectable()
export class ProductService {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(QueueContext) private readonly _qContext: QueueContext,
    @inject(ProductRepository) private readonly _repository: ProductRepository,
    @inject(TYPES.ScrapingOneProduct) private readonly _scrapingproductService: ScrapingProductService,
    @inject(TYPES.AlarmEngineService) private readonly _alarmEngine: AlarmEngineService,
    @inject(TYPES.AnalyticsService) private readonly _analytics: AnalyticsService,
    @inject(AttributeExtractorService) private readonly _attributeExtractor: AttributeExtractorService,
    @inject(EnrichmentMetricsService) private readonly _metrics: EnrichmentMetricsService,
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

    const results = await Promise.allSettled(batchProducts.map(product => this._repository.bulkInsertOrUpdate(product, ['url'])));

    for (const [i, result] of results.entries()) {
      if (result.status === 'fulfilled' && result.value?.url) {
        processedUrls.push(result.value.url);
      } else if (result.status === 'rejected') {
        const error = result.reason as { errors?: Record<string, { message?: string }> };
        Object.values(error.errors ?? {}).forEach((err: any) => err?.message && errors.push(err.message));
        this._log.warn(`Failed to process product with URL: ${batchProducts[i].url}`);
        invalidProductInfo.push(batchProducts[i]);
      }
    }

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
   * Enriches a product with computed analytics and extracted attributes.
   *
   * Analytics are always recomputed (they depend on history arrays which change
   * between scrapes). Attribute extraction is skipped when the description hash
   * matches the stored `enrichmentHash` and attributes are already populated —
   * this prevents re-sending identical descriptions to the LLM on every scrape.
   *
   * Runs as fire-and-forget — failures are logged but never propagated.
   *
   * @param {string} url - The product URL to enrich.
   */
  public async enrichProduct(url: string): Promise<void> {
    try {
      const product = await this._repository.findOne({ url });
      if (!product?._id) {
        this._log.warn(`enrichProduct: product not found for URL ${url}`);
        return;
      }

      // Analytics always recomputed — they depend on history arrays
      const analytics = this._analytics.compute(product);

      this._metrics.recordEnrichment();

      // Guard: skip attribute extraction if the description hasn't changed
      // since the last enrichment and attributes are already populated.
      const descHash = this._hashDescription(product.description);
      const skipExtraction =
        descHash !== '' && product.enrichmentHash === descHash && !!product.attributes && Object.keys(product.attributes).length > 0;

      let attributes: Record<string, unknown> = (product.attributes as Record<string, unknown>) ?? {};
      if (skipExtraction) {
        this._metrics.recordEnrichmentHashSkip();
        this._log.debug(`Skipping attribute extraction for ${url} — description unchanged`);
      } else {
        attributes = await this._attributeExtractor.extract(product.description);
      }

      const update: Record<string, unknown> = { enrichmentHash: descHash };
      if (analytics) update.analytics = analytics;
      if (Object.keys(attributes).length > 0) update.attributes = attributes;

      await this._repository.update(product._id, update as Partial<IRevolicoProduct>);
      this._log.debug(`Enriched product ${url}`);
    } catch (err) {
      this._log.error(`Failed to enrich product ${url}`, (err as Error).message);
    }
  }

  /**
   * Computes the MD5 hash of a description, used as a deterministic key for
   * enrichment deduplication.
   *
   * @param {string | undefined} description - The raw listing description.
   * @returns {string} Hex-encoded MD5 hash, or empty string if description is empty.
   */
  private _hashDescription(description?: string): string {
    if (!description?.trim()) return '';
    return crypto.createHash('md5').update(description.trim().toLowerCase()).digest('hex');
  }

  /**
   * Listens for the completed event on the product storage queue.
   * When a job is completed, evaluates alarms, enriches products, and schedules detail scraping.
   */
  public setupQueueListeners(): void {
    const adapter = this._qContext.getAdapter();
    adapter.onCompleted<{ url: string }[]>(QUEUE_NAME.product_storage, async ({ data, result }) => {
      const products = (data as IRevolicoProduct[] | undefined) ?? [];
      const stored = result ?? [];

      this._log.debug(`Storage completed: ${stored.length} products stored.`);

      // Evaluate alarms
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

      // Enrich products with analytics + attributes (fire-and-forget)
      for (const { url } of stored) {
        this.enrichProduct(url).catch(err => this._log.error(`enrichProduct failed for ${url}`, err));
      }

      // Fan out detail scraping
      const batchSize = Number(process.env.PRODUCT_URLS_BATCHSIZE) || 30;
      for (let i = 0; i < stored.length; i += batchSize) {
        const batch = stored.slice(i, i + batchSize);
        await this._scrapingproductService.addScrapingJob(batch, QUEUE_NAME.product_scraping);
        this._log.debug(`Scheduled batch of ${batch.length} product URLs for scraping`);
      }
    });
  }
}
