import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost } from 'inversify-express-utils';
import { ScrapingProductsService } from '@scrapers/revolico/services/scraping-products.service';
import { ResponseHandler } from '@shared/response-handler';
import { ScrapingProductsDTO } from '@scrapers/revolico/services/dto';
import { ValidateRequestMiddleware } from './middleware/validate-request.middleware';
import { QUEUE_NAME } from '../utils/constants';

@controller('/api/revolicos/scraping')
export class ScrapingController {
  constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(ScrapingProductsService) private scrapingJob: ScrapingProductsService,
  ) {
    this._log.context = ScrapingController.name;
  }

  @httpPost('/jobs', ValidateRequestMiddleware.with(ScrapingProductsDTO))
  async addNewJob(req: Request, res: Response) {
    const request = ScrapingProductsDTO.from(req.body);
    this._log.debug('Request to add a new Job', request);
    //const createdJobID = await this.scrapingJob.addScrapingJob(request, QUEUE_NAME.products_scraping.toString());
    ResponseHandler.created(res, `http:created`, { jobId: `createdJobID` });
  }
}
