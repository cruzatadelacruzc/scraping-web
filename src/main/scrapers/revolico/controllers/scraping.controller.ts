import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';
import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpPost } from 'inversify-express-utils';
import { ScrapingProductsService } from '@scrapers/revolico/services/scraping-products.service';
import { ResponseHandler } from '@shared/response-handler';
import { ScrapingProductsDTO } from '@scrapers/revolico/services/dto';
import { ValidateRequestMiddleware } from './middleware/validate-request.middleware';
import { QUEUE_NAME } from '../queues';

@controller('/api/revolicos/scraping')
export class ScrapingController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScrapingManyProduct) private scrapingJob: ScrapingProductsService,
  ) {
    this._log.context = ScrapingController.name;
  }

  /**
   * Handles a POST request to add a new scraping job to the queue.
   * The request body should contain a ScrapingProductsDTO object.
   * The response will contain a JobId as a JSON object.
   * @param {Request<ScrapingProductsDTO>} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>} - A promise that resolves when the job is added to the queue.
   * @throws {Error} - If the job cannot be added to the queue.
   */
  @httpPost('/jobs', ValidateRequestMiddleware.with(ScrapingProductsDTO))
  public async addNewJob(req: Request, res: Response): Promise<void> {
    const request = ScrapingProductsDTO.from(req.body);
    this._log.debug('Request to add a new Job', request);
    const createdJobID = await this.scrapingJob.addScrapingJob(request, QUEUE_NAME.products_scraping.toString());
    ResponseHandler.created(res, `http:created`, { jobId: createdJobID });
  }
}
