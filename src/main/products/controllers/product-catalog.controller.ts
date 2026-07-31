import { Request, Response } from 'express';
import { inject } from 'inversify';
import { controller, httpGet, request, response } from 'inversify-express-utils';
import { ZodError } from 'zod';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ILogger } from '@shared/logger.interface';
import { ResponseHandler } from '@shared/response-handler';
import { TYPES } from '@shared/types.container';
import { ProductCatalogService } from '../services/product-catalog.service';
import { ProductCatalogQueryDTO } from '../services/dto/product-catalog-query.dto';

/**
 * Customer-facing product catalog endpoints (ACCOUNT_OWNER only).
 */
@controller('/api/products')
export class ProductCatalogController {
  public constructor(
    @inject(TYPES.ProductCatalogService) private readonly _service: ProductCatalogService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ProductCatalogController.name;
  }

  /**
   * Paginated catalog search for ACCOUNT_OWNER users.
   */
  @httpGet('/', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const result = await this._service.list(ProductCatalogQueryDTO.from(req.query));
      ResponseHandler.ok(res, result);
    } catch (err) {
      if (err instanceof ZodError) {
        ResponseHandler.error(res, 'Invalid query parameters', 400);
        return;
      }
      this._log.error('Failed to list catalog products', { error: err });
      ResponseHandler.error(res, 'Failed to list products', 500);
    }
  }

  /**
   * Distinct category/subcategory groups for filter UIs.
   */
  @httpGet('/categories', AuthMiddleware.forRoles('ACCOUNT_OWNER'))
  public async categories(@request() _req: Request, @response() res: Response): Promise<void> {
    try {
      ResponseHandler.ok(res, await this._service.categories());
    } catch (err) {
      this._log.error('Failed to list catalog categories', { error: err });
      ResponseHandler.error(res, 'Failed to list categories', 500);
    }
  }
}
