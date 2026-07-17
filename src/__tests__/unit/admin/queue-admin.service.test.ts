import { QueueAdminService } from '@admin/services/queue-admin.service';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { IQueueAdapter } from '@shared/queue/port/queue-adapter.interfaces';
import { ILogger } from '@shared/logger.interface';

describe('QueueAdminService', () => {
  let service: QueueAdminService;
  let registryMock: IQueueAdapterRegistry;
  let adapterMock: IQueueAdapter;
  let loggerMock: ILogger;

  const createMockQueue = (name: string, overrides: Record<string, any> = {}): Record<string, any> => ({
    name,
    getJobCounts: jest.fn().mockResolvedValue({}),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue(null),
    ...overrides,
  });

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
    } as unknown as IQueueAdapterRegistry;

    service = new QueueAdminService(registryMock, loggerMock);
  });

  describe('structural', () => {
    it('should set logger context to QueueAdminService', () => {
      expect(loggerMock.context).toBe('QueueAdminService');
    });
  });

  describe('getAllQueueStats', () => {
    it('should return empty array when no dashboard queues exist (Mock backend)', async () => {
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([]);

      const result = await service.getAllQueueStats();

      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith(
        'getAllQueueStats: no dashboard queues available (non-BullMQ backend or no queues registered)',
      );
    });

    it('should return stats for each registered queue', async () => {
      const mockQueue1 = createMockQueue('scraping', {
        getJobCounts: jest.fn().mockResolvedValue({ waiting: 5, active: 2, completed: 100, failed: 3 }),
      });
      const mockQueue2 = createMockQueue('notifications', {
        getJobCounts: jest.fn().mockResolvedValue({ waiting: 0, completed: 50 }),
      });

      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([
        { name: 'scraping', queue: mockQueue1 },
        { name: 'notifications', queue: mockQueue2 },
      ]);

      const result = await service.getAllQueueStats();

      expect(result).toHaveLength(2);
      expect(result[0].queueName).toBe('scraping');
      expect(result[0].counts).toEqual({ waiting: 5, active: 2, completed: 100, failed: 3 });
      expect(result[1].queueName).toBe('notifications');
      expect(result[1].counts).toEqual({ waiting: 0, completed: 50 });
    });

    it('should use the current adapter from registry', async () => {
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([]);

      await service.getAllQueueStats();

      expect(registryMock.getCurrent).toHaveBeenCalledTimes(1);
    });
  });

  describe('getQueueStats', () => {
    it('should return null when queue not found', async () => {
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([]);

      const result = await service.getQueueStats('nonexistent');

      expect(result).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalledWith('Queue "nonexistent" not found');
    });

    it('should return stats for a specific queue', async () => {
      const mockQueue = createMockQueue('scraping', {
        getJobCounts: jest.fn().mockResolvedValue({ waiting: 10, active: 3, completed: 42 }),
      });

      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([
        { name: 'scraping', queue: mockQueue },
        { name: 'other', queue: createMockQueue('other') },
      ]);

      const result = await service.getQueueStats('scraping');

      expect(result).not.toBeNull();
      expect(result!.queueName).toBe('scraping');
      expect(result!.counts).toEqual({ waiting: 10, active: 3, completed: 42 });
    });
  });

  describe('getRecentJobs', () => {
    it('should return empty array when queue not found', async () => {
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([]);

      const result = await service.getRecentJobs('nonexistent');

      expect(result).toEqual([]);
      expect(loggerMock.warn).toHaveBeenCalledWith('Queue "nonexistent" not found');
    });

    it('should return recent jobs for a queue with default params', async () => {
      const mockJobs = [
        { id: '1', name: 'job-a', data: { url: '/a' }, attemptsMade: 0, progress: 100, timestamp: 1000 },
        { id: '2', name: 'job-b', data: { url: '/b' }, attemptsMade: 1, progress: 50, timestamp: 2000 },
      ];
      const mockQueue = createMockQueue('scraping', {
        getJobs: jest.fn().mockResolvedValue(mockJobs),
      });

      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      const result = await service.getRecentJobs('scraping');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
      // getJobs called with default: limit 20, asc=false (newest first)
      expect(mockQueue.getJobs).toHaveBeenCalled();
    });

    it('should pass status filter to getJobs when provided', async () => {
      const mockQueue = createMockQueue('scraping');
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      await service.getRecentJobs('scraping', 10, 'failed');

      const calledArgs = mockQueue.getJobs.mock.calls[0];
      // First argument should be ['failed'] (the types array with the status)
      expect(calledArgs).toBeDefined();
    });

    it('should limit results to provided limit', async () => {
      const mockJobs = Array.from({ length: 5 }, (_, i) => ({
        id: String(i),
        name: `job-${i}`,
        data: {},
        attemptsMade: 0,
        timestamp: 1000 + i,
      }));
      const mockQueue = createMockQueue('scraping', {
        getJobs: jest.fn().mockResolvedValue(mockJobs),
      });
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      const result = await service.getRecentJobs('scraping', 5);

      expect(result).toHaveLength(5);
    });
  });

  describe('getJobDetail', () => {
    it('should return null when queue not found', async () => {
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([]);

      const result = await service.getJobDetail('nonexistent', 'job-123');

      expect(result).toBeNull();
      expect(loggerMock.warn).toHaveBeenCalledWith('Queue "nonexistent" not found');
    });

    it('should return null when job not found', async () => {
      const mockQueue = createMockQueue('scraping', {
        getJob: jest.fn().mockResolvedValue(null),
      });
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      const result = await service.getJobDetail('scraping', 'job-123');

      expect(result).toBeNull();
    });

    it('should return job detail for a found job', async () => {
      const mockJob = {
        id: 'job-123',
        name: 'scrape-product',
        data: { url: 'https://example.com' },
        progress: 100,
        attemptsMade: 0,
        timestamp: 1700000000000,
        processedOn: 1700000001000,
        finishedOn: 1700000005000,
        returnvalue: { success: true },
      };
      const mockQueue = createMockQueue('scraping', {
        getJob: jest.fn().mockResolvedValue(mockJob),
      });
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      const result = await service.getJobDetail('scraping', 'job-123');

      expect(result).not.toBeNull();
      expect(result!.id).toBe('job-123');
      expect(result!.name).toBe('scrape-product');
    });

    it('should call getJob on the correct queue with correct jobId', async () => {
      const mockQueue = createMockQueue('scraping', {
        getJob: jest.fn().mockResolvedValue(null),
      });
      (adapterMock.getDashboardQueues as jest.Mock).mockReturnValue([{ name: 'scraping', queue: mockQueue }]);

      await service.getJobDetail('scraping', 'job-abc');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-abc');
    });
  });
});
