import { Container } from 'inversify';
import {RevolicoController} from '@scrapers/revolico/controllers/revolico.controller';
import { Logger } from '@shared/logger';
import { RevolicoFetchDataService } from '@scrapers/revolico/services/fetch-data.service';
import { DBContext } from '@config/db-config';
import { IFetchProductData } from '@shared/fetch-product-data.interfaces';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interfaces';

export const container = new Container({
  defaultScope: 'Singleton'
});

//shared
container.bind<ILogger>(TYPES.Logger).to(Logger);
container.bind(DBContext).toSelf();

//services
container.bind<IFetchProductData>(TYPES.RevolicoData).to(RevolicoFetchDataService);

//controllers
container.bind(RevolicoController).toSelf();
