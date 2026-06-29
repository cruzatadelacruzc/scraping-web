import { inject, injectable } from 'inversify';
import { IQueueModule } from '@shared/queue-module.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { FailedListener, IQueueFailedEvent } from '@shared/queue/port/queue-adapter.interfaces';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { ScrapingProductsService } from './services/scraping-products.service';
import { ProductService } from './services/product.service';
import { GenericListingScraperService } from './services/scraping/generic-listing-scraper.service';
import { GenericDetailScraperService } from './services/scraping/generic-detail-scraper.service';
import { JsonataExtractionError } from './errors/jsonata-extraction.error';

export const QUEUE_NAME = {
  products_scraping: 'PRODUCTS_SCRAPING',
  product_storage: 'PRODUCT_STORAGE',
  product_scraping: 'PRODUCT_SCRAPING',
};

const INPUT_JSON_SNIPPET_BYTES = 2048;

@injectable()
export class RevolicoQueues implements IQueueModule {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.QueueAdapterRegistry) private readonly _adapterRegistry: IQueueAdapterRegistry,
    @inject(TYPES.ScrapingManyProduct) private readonly _scrapingProductsService: ScrapingProductsService,
    @inject(TYPES.ProductService) private readonly _productService: ProductService,
    @inject(TYPES.GenericListingScraper) private readonly _genericListing: GenericListingScraperService,
    @inject(TYPES.GenericDetailScraper) private readonly _genericDetail: GenericDetailScraperService,
  ) {
    this._log.context = RevolicoQueues.name;
  }

  public getModuleNmame(): string {
    return 'REVOLICO';
  }

  public getProcessor(queueName: string): (ctx: IJobContext<any>) => Promise<any> {
    switch (queueName) {
      case QUEUE_NAME.products_scraping:
        // JSONata-driven: expression lives in ScraperConfig "revolico:listing".
        return this._genericListing.processor.bind(this._genericListing) as (ctx: IJobContext<any>) => Promise<any>;

      case QUEUE_NAME.product_scraping:
        // JSONata-driven: expression lives in ScraperConfig "revolico:detail".
        return this._genericDetail.processor.bind(this._genericDetail) as (ctx: IJobContext<any>) => Promise<any>;

      case QUEUE_NAME.product_storage:
        return this._productService.processor.bind(this._productService) as (ctx: IJobContext<any>) => Promise<any>;

      default:
        this._log.error(`No processor defined for queue: ${queueName}`);
        throw new Error(`No processor defined for queue: ${queueName}`);
    }
  }

  public getQueuesToInitialize(): string[] {
    return [QUEUE_NAME.products_scraping, QUEUE_NAME.product_storage, QUEUE_NAME.product_scraping];
  }

  public setupQueueListeners(): void {
    // Listing-completed → fan out into product_storage jobs.
    this._scrapingProductsService.setupQueueListeners();
    this._productService.setupQueueListeners();

    // Failed-job listeners: emit a structured _log.error for every queue so
    // workers' throws surface in stdout / file logs (Bull Board alone is not
    // enough — the user needs application logs to debug without opening UI).
    const adapter = this._adapterRegistry.getCurrent();
    for (const queueName of this.getQueuesToInitialize()) {
      adapter.onFailed(queueName, this.buildFailedJobListener(queueName));
    }
  }

  /**
   * Builds a {@link FailedListener} that logs failed jobs at error level via
   * the injected {@link ILogger}. Pulls `code`, `expression`, and a 2 KB
   * `inputJson` snippet from {@link JsonataExtractionError} when applicable,
   * and the underlying stack trace from any `Error`. Public for unit testing.
   *
   * @param queueName Name of the queue this listener will be bound to.
   * @returns A `FailedListener` ready to register via `adapter.onFailed`.
   */
  public buildFailedJobListener(queueName: string): FailedListener {
    return (event: IQueueFailedEvent) => {
      const fields: Record<string, unknown> = {
        queueName,
        jobId: event.jobId,
        jobName: event.name,
        reason: event.reason,
        data: event.data,
      };

      const err = event.error;
      if (err instanceof Error) {
        fields.stack = err.stack;
      }
      if (err instanceof JsonataExtractionError) {
        fields.code = err.code;
        fields.expression = err.expression;
        try {
          fields.inputJsonSnippet = JSON.stringify(err.inputJson).slice(0, INPUT_JSON_SNIPPET_BYTES);
        } catch {
          fields.inputJsonSnippet = '[unserializable]';
        }
      }

      this._log.error(`[revolico] job failed on queue "${queueName}"`, fields);
    };
  }
}
