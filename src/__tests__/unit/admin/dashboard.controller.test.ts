import { Request, Response } from 'express';

const dashboardServiceMock = {
  getMetrics: jest.fn(),
  getHealth: jest.fn(),
};

jest.mock('@admin/services/dashboard.service', () => ({
  DashboardService: jest.fn().mockImplementation(() => dashboardServiceMock),
}));

import { DashboardController } from '@admin/controllers/dashboard.controller';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { DashboardService } from '@admin/services/dashboard.service';
import { EnrichmentMetricsService } from '@scrapers/services/enrichment-metrics.service';

describe('DashboardController', () => {
  let controller: DashboardController;
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

    const serviceInstance = new (DashboardService as jest.Mock)() as DashboardService;

    const metricsMock = {
      getSnapshot: jest.fn().mockReturnValue({ startedAt: new Date().toISOString(), totalEnrichments: 0 }),
    } as unknown as EnrichmentMetricsService;

    controller = new DashboardController(serviceInstance, metricsMock, loggerMock);

    jest.spyOn(ResponseHandler, 'ok');
    jest.spyOn(ResponseHandler, 'error');
  });

  describe('structural', () => {
    it('should be decorated with @injectable()', () => {
      const hasParamTypes = Reflect.hasOwnMetadata('inversify:paramtypes', DashboardController);
      expect(hasParamTypes).toBe(true);
    });
  });

  describe('getMetrics', () => {
    it('should return dashboard metrics via ResponseHandler.ok', async () => {
      const metrics = {
        productCount: 100,
        categoriesBreakdown: [{ category: 'Electronics', count: 50 }],
        totalAccounts: 5,
        totalUsers: 20,
        activeSubscriptions: 3,
        recentProducts: [{ _id: 'p1', description: 'Test' }],
      };
      dashboardServiceMock.getMetrics.mockResolvedValue(metrics);

      const req = {} as Request;
      await controller.getMetrics(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, metrics);
    });

    it('should handle service errors', async () => {
      dashboardServiceMock.getMetrics.mockRejectedValue(new Error('DB down'));

      const req = {} as Request;
      await controller.getMetrics(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get dashboard metrics', 500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe('getHealth', () => {
    it('should return health status via ResponseHandler.ok', async () => {
      const health = {
        services: [
          { service: 'mongodb', status: 'connected' },
          { service: 'postgres', status: 'connected' },
          { service: 'redis', status: 'connected' },
        ],
        timestamp: '2025-01-01T00:00:00.000Z',
      };
      dashboardServiceMock.getHealth.mockResolvedValue(health);

      const req = {} as Request;
      await controller.getHealth(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, health);
    });

    it('should return health with errors when services are down', async () => {
      const health = {
        services: [
          { service: 'mongodb', status: 'error', error: 'timeout' },
          { service: 'postgres', status: 'connected' },
          { service: 'redis', status: 'connected' },
        ],
        timestamp: '2025-01-01T00:00:00.000Z',
      };
      dashboardServiceMock.getHealth.mockResolvedValue(health);

      const req = {} as Request;
      await controller.getHealth(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, health);
    });

    it('should handle service errors', async () => {
      dashboardServiceMock.getHealth.mockRejectedValue(new Error('Unexpected error'));

      const req = {} as Request;
      await controller.getHealth(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get health status', 500);
    });
  });
});
