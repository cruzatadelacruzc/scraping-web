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
import { BullBoardService } from './bull-board';
import { ProductService } from '@scrapers/revolico/services/product.service';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { ScrapingProductService } from '@scrapers/revolico/services/scraping-product.service';

export const container = new Container();

//shared
container.bind<ILogger>(TYPES.Logger).to(Logger);
container.bind(DBContext).toSelf().inSingletonScope();
container.bind(QContext).toSelf().inSingletonScope();
container.bind(BullBoardService).toSelf().inSingletonScope();

//services
container.bind<IFetchProductData>(TYPES.RevolicoData).to(RevolicoFetchDataService);
container.bind(ScrapingProductsService).toSelf();
container.bind(ScrapingProductService).toSelf();
container.bind(ProductService).toSelf();

//controllers
container.bind<ScrapingController>(TYPES.RevolicoScraping).to(ScrapingController);

// Repositories
container.bind(ProductRepository).toSelf();
