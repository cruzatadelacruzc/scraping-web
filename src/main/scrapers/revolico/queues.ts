import { inject, injectable } from 'inversify';
import { ScrapingProductService } from './services/scraping-product.service';
import { IQueueModule } from '@shared/queue-module.interface';
import { Job } from 'bull';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { ScrapingProductsService } from './services/scraping-products.service';
import { ProductService } from './services/product.service';

export const QUEUE_NAME = {
  products_scraping: 'PRODUCTS_SCRAPING',
  product_storage: 'PRODUCT_STORAGE',
  product_scraping: 'PRODUCT_SCRAPING',
};
@injectable()
export class RevolicoQueues implements IQueueModule {
  constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScrapingManyProduct) private readonly _scrapingProductsService: ScrapingProductsService,
    @inject(TYPES.ScrapingOneProduct) private readonly _scrapingproductService: ScrapingProductService,
    @inject(TYPES.ProductService) private readonly _productService: ProductService,
  ) {
    this._log.context = RevolicoQueues.name;
  }


  getModuleNmame(): string {
    return 'REVOLICO';
  }

  getProcessor(queueName: string): (job: Job) => Promise<any> {
    switch (queueName) {
      case QUEUE_NAME.products_scraping:
        return this._scrapingProductsService.processor.bind(this._scrapingProductsService);

      case QUEUE_NAME.product_scraping:
        return this._scrapingproductService.processor.bind(this._scrapingproductService);

      case QUEUE_NAME.product_storage:
        return this._productService.processor.bind(this._productService);

      default:
        throw new Error(`No processor defined for queue: ${queueName}`);
    }
  }

  getQueuesToInitialize(): string[] {
    return [QUEUE_NAME.products_scraping, QUEUE_NAME.product_storage, QUEUE_NAME.product_scraping];
  }
}