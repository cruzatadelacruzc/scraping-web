import { DashboardService } from '@admin/services/dashboard.service';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { IQueueAdapter } from '@shared/queue/port/queue-adapter.interfaces';
import { ILogger } from '@shared/logger.interface';
import { ProductRepository } from '@scrapers/revolico/repositories/product.repository';
import { PrismaClient } from '@prisma/client';

describe('DashboardService', () => {
  let service: DashboardService;
  let productRepoMock: jest.Mocked<ProductRepository>;
  let prismaMock: jest.Mocked<PrismaClient>;
  let registryMock: IQueueAdapterRegistry;
  let adapterMock: IQueueAdapter;
  let loggerMock: ILogger;

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

    productRepoMock = {
      count: jest.fn(),
      aggregate: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      clearAll: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      bulkInsertOrUpdate: jest.fn(),
    } as unknown as jest.Mocked<ProductRepository>;

    prismaMock = {
      account: { count: jest.fn() },
      user: { count: jest.fn() },
      accountSubscription: { count: jest.fn() },
      $queryRaw: jest.fn(),
    } as unknown as jest.Mocked<PrismaClient>;

    adapterMock = {
      backend: 'bullmq',
      getDashboardQueues: jest.fn().mockReturnValue([]),
      enqueue: jest.fn(),
      registerWorker: jest.fn(),
      onCompleted: jest.fn(),
      onFailed: jest.fn(),
      onProgress: jest.fn(),
      describe: jest.fn(),
      shutdown: jest.fn(),
    } as unknown as IQueueAdapter;

    registryMock = {
      getCurrent: jest.fn().mockReturnValue(adapterMock),
      get: jest.fn().mockReturnValue(adapterMock),
    };

    service = new DashboardService(productRepoMock, prismaMock, registryMock, loggerMock);
  });

  describe('structural', () => {
    it('should set logger context to DashboardService', () => {
      expect(loggerMock.context).toBe('DashboardService');
    });
  });

  describe('getMetrics', () => {
    it('should aggregate metrics from all data sources', async () => {
      productRepoMock.count.mockResolvedValue(150);
      productRepoMock.aggregate.mockResolvedValue([
        { _id: 'Electronics', count: 50 },
        { _id: 'Vehicles', count: 100 },
      ]);
      productRepoMock.find.mockResolvedValue([
        {
          _id: 'p1',
          ID: 'id1',
          category: 'Electronics',
          url: 'http://ex.com/1',
          description: 'iPhone',
          price: 500,
          currency: 'USD',
          isOutstanding: false,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        } as any,
      ]);
      (prismaMock.account.count as jest.Mock).mockResolvedValue(12);
      (prismaMock.user.count as jest.Mock).mockResolvedValue(45);
      (prismaMock.accountSubscription.count as jest.Mock).mockResolvedValue(8);

      const metrics = await service.getMetrics();

      expect(metrics.productCount).toBe(150);
      expect(metrics.categoriesBreakdown).toEqual([
        { category: 'Electronics', count: 50 },
        { category: 'Vehicles', count: 100 },
      ]);
      expect(metrics.totalAccounts).toBe(12);
      expect(metrics.totalUsers).toBe(45);
      expect(metrics.activeSubscriptions).toBe(8);
      expect(metrics.recentProducts).toHaveLength(1);
    });

    it('should handle empty data gracefully', async () => {
      productRepoMock.count.mockResolvedValue(0);
      productRepoMock.aggregate.mockResolvedValue([]);
      productRepoMock.find.mockResolvedValue([]);
      (prismaMock.account.count as jest.Mock).mockResolvedValue(0);
      (prismaMock.user.count as jest.Mock).mockResolvedValue(0);
      (prismaMock.accountSubscription.count as jest.Mock).mockResolvedValue(0);

      const metrics = await service.getMetrics();

      expect(metrics.productCount).toBe(0);
      expect(metrics.categoriesBreakdown).toEqual([]);
      expect(metrics.totalAccounts).toBe(0);
      expect(metrics.totalUsers).toBe(0);
      expect(metrics.activeSubscriptions).toBe(0);
      expect(metrics.recentProducts).toEqual([]);
    });

    it('should filter active subscriptions correctly', async () => {
      productRepoMock.count.mockResolvedValue(10);
      productRepoMock.aggregate.mockResolvedValue([]);
      productRepoMock.find.mockResolvedValue([]);
      (prismaMock.account.count as jest.Mock).mockResolvedValue(3);
      (prismaMock.user.count as jest.Mock).mockResolvedValue(10);
      (prismaMock.accountSubscription.count as jest.Mock).mockResolvedValue(3);

      const metrics = await service.getMetrics();

      expect(prismaMock.accountSubscription.count).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'ACTIVE' } }));
      expect(metrics.activeSubscriptions).toBe(3);
    });
  });

  describe('getHealth', () => {
    it('should report connected for all services when healthy', async () => {
      productRepoMock.count.mockResolvedValue(10);
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'test', queue: {} }]);

      const health = await service.getHealth();

      expect(health.services).toHaveLength(3);
      expect(health.services[0]).toEqual({ service: 'mongodb', status: 'connected' });
      expect(health.services[1]).toEqual({ service: 'postgres', status: 'connected' });
      expect(health.services[2]).toEqual({ service: 'redis', status: 'connected' });
      expect(health.timestamp).toBeDefined();
    });

    it('should report error for mongodb when count fails', async () => {
      productRepoMock.count.mockRejectedValue(new Error('Connection refused'));
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'test', queue: {} }]);

      const health = await service.getHealth();

      const mongoService = health.services.find(s => s.service === 'mongodb');
      expect(mongoService).toBeDefined();
      expect(mongoService!.status).toBe('error');
      expect(mongoService!.error).toBeDefined();
      expect(mongoService!.error).toContain('Connection refused');
    });

    it('should report error for postgres when query fails', async () => {
      productRepoMock.count.mockResolvedValue(10);
      (prismaMock.$queryRaw as jest.Mock).mockRejectedValue(new Error('Connection refused'));
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'test', queue: {} }]);

      const health = await service.getHealth();

      const pgService = health.services.find(s => s.service === 'postgres');
      expect(pgService).toBeDefined();
      expect(pgService!.status).toBe('error');
      expect(pgService!.error).toBeDefined();
    });

    it('should report error for redis when adapter call fails', async () => {
      productRepoMock.count.mockResolvedValue(10);
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);
      (adapterMock.getDashboardQueues as jest.Mock).mockImplementation(() => {
        throw new Error('Redis unavailable');
      });

      const health = await service.getHealth();

      const redisService = health.services.find(s => s.service === 'redis');
      expect(redisService).toBeDefined();
      expect(redisService!.status).toBe('error');
      expect(redisService!.error).toBeDefined();
      expect(redisService!.error).toContain('Redis unavailable');
    });

    it('should include a timestamp in the response', async () => {
      productRepoMock.count.mockResolvedValue(10);
      (prismaMock.$queryRaw as jest.Mock).mockResolvedValue([{ result: 1 }]);
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'test', queue: {} }]);

      const health = await service.getHealth();

      expect(health.timestamp).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(health.timestamp)).not.toThrow();
    });
  });
});
