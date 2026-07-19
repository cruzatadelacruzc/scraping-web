import { Request, Response } from 'express';
import { controller, httpGet, httpDelete, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ValidateRequestMiddleware } from '@shared/middleware/validate-request.middleware';
import { ILogger } from '@shared/logger.interface';
import { ProductAdminService } from '@admin/services/product-admin.service';
import { ProductListQueryDTO } from '@admin/services/dto/product-list-query.dto';

@controller('/api/admin/products')
export class ProductAdminController {
  public constructor(
    @inject(TYPES.ProductAdminService) private readonly _service: ProductAdminService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ProductAdminController.name;
  }

  /**
   * Lists products with pagination, filtering, and sorting.
   * @param req - Express request with query parameters.
   * @param res - Express response.
   */
  @httpGet('/', AuthMiddleware.forRoles('SUPER_ADMIN'), ValidateRequestMiddleware.with(ProductListQueryDTO))
  public async list(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const result = await this._service.list(ProductListQueryDTO.from(req.query));
      ResponseHandler.ok(res, result);
    } catch (err) {
      this._log.error('Failed to list products', { error: err });
      ResponseHandler.error(res, 'Failed to list products', 500);
    }
  }

  /**
   * Returns aggregated statistics across all products.
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/stats', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getStats(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const stats = await this._service.getStats();
      ResponseHandler.ok(res, stats);
    } catch (err) {
      this._log.error('Failed to get product stats', { error: err });
      ResponseHandler.error(res, 'Failed to get product stats', 500);
    }
  }

  /**
   * Retrieves a single product by ID.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getById(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const product = await this._service.getById(req.params.id);
      if (!product) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, product);
    } catch (err) {
      this._log.error('Failed to get product', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get product', 500);
    }
  }

  /**
   * Retrieves price history for a product.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id/history/price', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getPriceHistory(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const history = await this._service.getPriceHistory(req.params.id);
      if (!history) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, history);
    } catch (err) {
      this._log.error('Failed to get price history', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get price history', 500);
    }
  }

  /**
   * Retrieves views history for a product.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id/history/views', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getViewsHistory(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const history = await this._service.getViewsHistory(req.params.id);
      if (!history) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, history);
    } catch (err) {
      this._log.error('Failed to get views history', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get views history', 500);
    }
  }

  /**
   * Retrieves location history for a product.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id/history/location', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getLocationHistory(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const history = await this._service.getLocationHistory(req.params.id);
      if (!history) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, history);
    } catch (err) {
      this._log.error('Failed to get location history', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get location history', 500);
    }
  }

  /**
   * Retrieves outstanding history for a product.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id/history/outstanding', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getOutstandingHistory(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const history = await this._service.getOutstandingHistory(req.params.id);
      if (!history) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, history);
    } catch (err) {
      this._log.error('Failed to get outstanding history', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get outstanding history', 500);
    }
  }

  /**
   * Retrieves promoted history for a product.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpGet('/:id/history/promoted', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getPromotedHistory(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const history = await this._service.getPromotedHistory(req.params.id);
      if (!history) {
        ResponseHandler.notFound(res, 'Product not found');
        return;
      }
      ResponseHandler.ok(res, history);
    } catch (err) {
      this._log.error('Failed to get promoted history', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to get promoted history', 500);
    }
  }

  /**
   * Deletes a product by ID.
   * @param req - Express request with product id in params.
   * @param res - Express response.
   */
  @httpDelete('/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async delete(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      await this._service.delete(req.params.id);
      ResponseHandler.deleted(res);
    } catch (err) {
      this._log.error('Failed to delete product', { error: err, productId: req.params.id });
      ResponseHandler.error(res, 'Failed to delete product', 500);
    }
  }
}
