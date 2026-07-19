import { Request, Response } from 'express';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const serviceMock = {
  list: jest.fn(),
  getById: jest.fn(),
  getPriceHistory: jest.fn(),
  getViewsHistory: jest.fn(),
  getLocationHistory: jest.fn(),
  getOutstandingHistory: jest.fn(),
  getPromotedHistory: jest.fn(),
  getStats: jest.fn(),
  delete: jest.fn(),
};

jest.mock('@admin/services/product-admin.service', () => ({
  ProductAdminService: jest.fn().mockImplementation(() => serviceMock),
}));

import { ProductAdminController } from '@admin/controllers/product-admin.controller';
import { ProductAdminService } from '@admin/services/product-admin.service';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';

describe('ProductAdminController', () => {
  let controller: ProductAdminController;
  let loggerMock: ILogger;
  let mockRes: Response;

  beforeEach(() => {
    jest.clearAllMocks();

    loggerMock = {
      context: '',
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      log: jest.fn(),
    } as unknown as ILogger;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as unknown as Response;

    const serviceInstance = new (ProductAdminService as jest.Mock)() as ProductAdminService;

    controller = new ProductAdminController(serviceInstance, loggerMock);

    jest.spyOn(ResponseHandler, 'ok');
    jest.spyOn(ResponseHandler, 'success');
    jest.spyOn(ResponseHandler, 'error');
    jest.spyOn(ResponseHandler, 'notFound');
    jest.spyOn(ResponseHandler, 'deleted');
  });

  // -------------------------------------------------------------------------
  // Structural
  // -------------------------------------------------------------------------
  describe('structural', () => {
    it('should have inversify param types metadata', () => {
      const hasParamTypes = Reflect.hasOwnMetadata('inversify:paramtypes', ProductAdminController);
      expect(hasParamTypes).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // GET / — list
  // -------------------------------------------------------------------------
  describe('list', () => {
    it('should return paginated products via ResponseHandler.ok', async () => {
      const paginated = {
        data: [{ _id: 'abc' }],
        meta: { total: 1, skip: 0, limit: 20, hasMore: false },
      };
      serviceMock.list.mockResolvedValue(paginated);

      const req = { query: { skip: '0', limit: '20' } } as unknown as Request;
      await controller.list(req, mockRes);

      expect(serviceMock.list).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 20 }));
      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, paginated);
    });

    it('should pass parsed query parameters with filters to the service', async () => {
      const paginated = {
        data: [{ _id: 'xyz' }],
        meta: { total: 1, skip: 40, limit: 10, hasMore: false },
      };
      serviceMock.list.mockResolvedValue(paginated);

      const req = {
        query: { skip: '40', limit: '10', search: 'casa', category: 'inmuebles' },
      } as unknown as Request;
      await controller.list(req, mockRes);

      expect(serviceMock.list).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, limit: 10, search: 'casa', category: 'inmuebles' }),
      );
      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, paginated);
    });

    it('should handle service errors', async () => {
      serviceMock.list.mockRejectedValue(new Error('DB error'));

      const req = { query: {} } as unknown as Request;
      await controller.list(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to list products', 500);
    });
  });

  // -------------------------------------------------------------------------
  // GET /stats — getStats
  // -------------------------------------------------------------------------
  describe('getStats', () => {
    it('should return stats via ResponseHandler.ok', async () => {
      const stats = {
        totalProducts: 100,
        byCategory: [{ category: 'inmuebles', count: 50 }],
        byState: [{ state: 'La Habana', count: 80 }],
        outstandingCount: 10,
        promotedCount: 5,
        lastScrapedAt: '2025-01-15T00:00:00.000Z',
        priceRange: { min: 100, max: 50000 },
      };
      serviceMock.getStats.mockResolvedValue(stats);

      const req = {} as Request;
      await controller.getStats(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, stats);
    });

    it('should handle service errors', async () => {
      serviceMock.getStats.mockRejectedValue(new Error('Aggregation error'));

      const req = {} as Request;
      await controller.getStats(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get product stats', 500);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id — getById
  // -------------------------------------------------------------------------
  describe('getById', () => {
    it('should return product detail when found', async () => {
      const product = { _id: 'abc', url: 'https://x.com/item', currency: 'USD', price: 10, isOutstanding: false };
      serviceMock.getById.mockResolvedValue(product);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getById(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, product);
    });

    it('should return 404 when product not found', async () => {
      serviceMock.getById.mockResolvedValue(null);

      const req = { params: { id: 'nonexistent' } } as unknown as Request;
      await controller.getById(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, 'Product not found');
    });

    it('should handle service errors', async () => {
      serviceMock.getById.mockRejectedValue(new Error('DB error'));

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getById(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get product', 500);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/history/price
  // -------------------------------------------------------------------------
  describe('getPriceHistory', () => {
    it('should return price history', async () => {
      const history = { data: [{ value: 50000, updatedAt: '2025-01-10T00:00:00.000Z' }], total: 1 };
      serviceMock.getPriceHistory.mockResolvedValue(history);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getPriceHistory(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, history);
    });

    it('should return 404 when product not found', async () => {
      serviceMock.getPriceHistory.mockResolvedValue(null);

      const req = { params: { id: 'nonexistent' } } as unknown as Request;
      await controller.getPriceHistory(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, 'Product not found');
    });

    it('should handle service errors', async () => {
      serviceMock.getPriceHistory.mockRejectedValue(new Error('DB error'));

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getPriceHistory(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/history/views
  // -------------------------------------------------------------------------
  describe('getViewsHistory', () => {
    it('should return views history', async () => {
      const history = { data: [{ value: 150, updatedAt: '2025-01-10T00:00:00.000Z' }], total: 1 };
      serviceMock.getViewsHistory.mockResolvedValue(history);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getViewsHistory(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, history);
    });

    it('should return 404 when product not found', async () => {
      serviceMock.getViewsHistory.mockResolvedValue(null);

      const req = { params: { id: 'nonexistent' } } as unknown as Request;
      await controller.getViewsHistory(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, 'Product not found');
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/history/location
  // -------------------------------------------------------------------------
  describe('getLocationHistory', () => {
    it('should return location history', async () => {
      const history = {
        data: [{ location: { state: 'La Habana', municipality: 'Plaza' }, updatedAt: '2025-01-10T00:00:00.000Z' }],
        total: 1,
      };
      serviceMock.getLocationHistory.mockResolvedValue(history);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getLocationHistory(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, history);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/history/outstanding
  // -------------------------------------------------------------------------
  describe('getOutstandingHistory', () => {
    it('should return outstanding history', async () => {
      const history = { data: [{ value: 1, updatedAt: '2025-01-10T00:00:00.000Z' }], total: 1 };
      serviceMock.getOutstandingHistory.mockResolvedValue(history);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getOutstandingHistory(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, history);
    });
  });

  // -------------------------------------------------------------------------
  // GET /:id/history/promoted
  // -------------------------------------------------------------------------
  describe('getPromotedHistory', () => {
    it('should return promoted history', async () => {
      const history = { data: [{ value: 1, updatedAt: '2025-01-10T00:00:00.000Z' }], total: 1 };
      serviceMock.getPromotedHistory.mockResolvedValue(history);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.getPromotedHistory(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, history);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /:id — delete
  // -------------------------------------------------------------------------
  describe('delete', () => {
    it('should call ResponseHandler.deleted on success', async () => {
      serviceMock.delete.mockResolvedValue(undefined);

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.delete(req, mockRes);

      expect(serviceMock.delete).toHaveBeenCalledWith('abc');
      expect(ResponseHandler.deleted).toHaveBeenCalledWith(mockRes);
    });

    it('should handle service errors', async () => {
      serviceMock.delete.mockRejectedValue(new Error('DB error'));

      const req = { params: { id: 'abc' } } as unknown as Request;
      await controller.delete(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to delete product', 500);
    });
  });
});
