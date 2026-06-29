import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, httpPost, httpPut, request, response, requestParam } from 'inversify-express-utils';
import { TYPES } from '@shared/types.container';
import { ILogger } from '@shared/logger.interface';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ScraperConfigService } from '@scrapers/revolico/services/scraping/scraper-config.service';
import { CreateScraperConfigDTO, UpdateScraperConfigDTO } from '@scrapers/revolico/services/dto/scraper-config.dto';
import { ScraperConfigNotFoundError } from '@scrapers/revolico/errors/scraper-config-not-found.error';
import { ScraperConfigAlreadyExistsError } from '@scrapers/revolico/errors/scraper-config-already-exists.error';

/**
 * Admin CRUD endpoints for the JSONata expressions that drive the Revolico
 * scrapers. All routes are gated behind `SUPER_ADMIN` because misconfigured
 * expressions silently break the worker pipeline (no row → `CONFIG_MISSING`
 * error in Bull-Board).
 *
 * Routes:
 *   POST   /api/revolicos/scraper-configs              — create new config
 *   GET    /api/revolicos/scraper-configs              — list all configs
 *   GET    /api/revolicos/scraper-configs/:storeKey    — fetch one
 *   PUT    /api/revolicos/scraper-configs/:storeKey    — update expression
 *
 * @class ScraperConfigController
 */
@controller('/api/revolicos/scraper-configs')
export class ScraperConfigController {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScraperConfigService) private readonly _service: ScraperConfigService,
  ) {
    this._log.context = ScraperConfigController.name;
  }

  /**
   * Create a new `ScraperConfig` row. Body: `{ storeKey, expression }`.
   *
   * @param {Request} req - Express request with validated body.
   * @param {Response} res - Express response.
   * @returns {Promise<void>} 201 with the persisted row, 409 if `storeKey` exists,
   *   400 if the expression fails JSONata validation.
   */
  @httpPost('/', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(CreateScraperConfigDTO))
  public async create(@request() req: Request, @response() res: Response): Promise<void> {
    const dto = CreateScraperConfigDTO.from(req.body);
    this._log.debug('REST request to create ScraperConfig', { storeKey: dto.storeKey });

    try {
      const created = await this._service.create(dto.storeKey, dto.expression);
      ResponseHandler.created(res, 'http:created', { config: created });
    } catch (err) {
      if (err instanceof ScraperConfigAlreadyExistsError) {
        ResponseHandler.error(res, err.message, 409);
        return;
      }
      if (err instanceof Error && /invalid jsonata/i.test(err.message)) {
        ResponseHandler.badRequest(res, err.message);
        return;
      }
      throw err;
    }
  }

  /**
   * List every `ScraperConfig` row (enabled and disabled), sorted by `storeKey`.
   *
   * @param {Response} res - Express response.
   * @returns {Promise<void>} 200 with `{ configs: [...] }`.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async list(@response() res: Response): Promise<void> {
    this._log.debug('REST request to list ScraperConfig rows');
    const configs = await this._service.list();
    ResponseHandler.ok(res, { configs });
  }

  /**
   * Fetch a single `ScraperConfig` row by `storeKey`.
   *
   * @param {string} storeKey - The ScraperConfig key from the URL.
   * @param {Response} res - Express response.
   * @returns {Promise<void>} 200 with `{ config }`, or 404 if not found.
   */
  @httpGet('/:storeKey', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async findOne(@requestParam('storeKey') storeKey: string, @response() res: Response): Promise<void> {
    this._log.debug('REST request to fetch ScraperConfig', { storeKey });
    try {
      const config = await this._service.findOne(storeKey);
      ResponseHandler.ok(res, { config });
    } catch (err) {
      if (err instanceof ScraperConfigNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      throw err;
    }
  }

  /**
   * Update the `expression` of an existing row. Body: `{ expression }`.
   *
   * @param {string} storeKey - The ScraperConfig key from the URL.
   * @param {Request} req - Express request with validated body.
   * @param {Response} res - Express response.
   * @returns {Promise<void>} 200 with `{ config }`, 404 if missing,
   *   400 if the new expression fails JSONata validation.
   */
  @httpPut('/:storeKey', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(UpdateScraperConfigDTO))
  public async update(@requestParam('storeKey') storeKey: string, @request() req: Request, @response() res: Response): Promise<void> {
    const dto = UpdateScraperConfigDTO.from(req.body);
    this._log.debug('REST request to update ScraperConfig', { storeKey });

    try {
      const updated = await this._service.update(storeKey, dto.expression);
      ResponseHandler.updated(res, { config: updated });
    } catch (err) {
      if (err instanceof ScraperConfigNotFoundError) {
        ResponseHandler.notFound(res, err.message);
        return;
      }
      if (err instanceof Error && /invalid jsonata/i.test(err.message)) {
        ResponseHandler.badRequest(res, err.message);
        return;
      }
      throw err;
    }
  }
}
