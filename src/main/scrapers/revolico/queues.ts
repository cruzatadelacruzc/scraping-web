import { inject, injectable } from 'inversify';
import { ScrapingProductService } from './services/scraping-product.service';
import { IQueueModule } from '@shared/queue-module.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { ScrapingProductsService } from './services/scraping-products.service';
import { ProductService } from './services/product.service';
import { GenericListingScraperService } from './services/scraping/generic-listing-scraper.service';
import { GenericDetailScraperService } from './services/scraping/generic-detail-scraper.service';

export const QUEUE_NAME = {
  products_scraping: 'PRODUCTS_SCRAPING',
  product_storage: 'PRODUCT_STORAGE',
  product_scraping: 'PRODUCT_SCRAPING',
};
@injectable()
export class RevolicoQueues implements IQueueModule {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScrapingManyProduct) private readonly _scrapingProductsService: ScrapingProductsService,
    @inject(TYPES.ScrapingOneProduct) private readonly _scrapingProductService: ScrapingProductService,
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
  }
}
