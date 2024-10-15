import { Container } from 'inversify';
import { ScrapingController } from '@scrapers/revolico/controllers/scraping.controller';
import { Logger } from '@shared/logger';
import { RevolicoFetchDataService } from '@scrapers/revolico/services/fetch-data.service';
import { DBContext } from '@config/db-config';
import { QContext } from '@config/queue.config';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interfaces';
import { ScrapingProductsService } from '@scrapers/revolico/services/scraping-products.service';
import { ProductService } from '@scrapers/revolico/services/product.service';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ScrapingProductService } from '@scrapers/revolico/services/scraping-product.service';
import { RevolicoQueues } from '@scrapers/revolico/queues';
import { BullArenaService } from './bull-arena';
import { IQueueModule } from './queue-module.interface';

export const container = new Container();

//shared
container.bind<ILogger>(TYPES.Logger).to(Logger);
container.bind(DBContext).toSelf().inSingletonScope();
container.bind(QContext).toSelf().inSingletonScope();
container.bind(BullArenaService).toSelf().inSingletonScope();

//services
container.bind<IFetchProductData>(TYPES.RevolicoData).to(RevolicoFetchDataService);
container.bind(TYPES.ScrapingManyProduct).to(ScrapingProductsService);
container.bind(TYPES.ScrapingOneProduct).to(ScrapingProductService);
container.bind(TYPES.ProductService).to(ProductService);
container.bind<IQueueModule>(TYPES.RevolicoQueues).to(RevolicoQueues);

//controllers
container.bind<ScrapingController>(TYPES.RevolicoScraping).to(ScrapingController);

// Repositories
container.bind(ProductRepository).toSelf();
