import { Request, Response } from 'express';

const queueAdminServiceMock = {
  getAllQueueStats: jest.fn(),
  getQueueStats: jest.fn(),
  getRecentJobs: jest.fn(),
  getJobDetail: jest.fn(),
};

jest.mock('@admin/services/queue-admin.service', () => ({
  QueueAdminService: jest.fn().mockImplementation(() => queueAdminServiceMock),
}));

import { QueueAdminController } from '@admin/controllers/queue-admin.controller';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { QueueAdminService } from '@admin/services/queue-admin.service';

describe('QueueAdminController', () => {
  let controller: QueueAdminController;
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

    const serviceInstance = new (QueueAdminService as jest.Mock)() as QueueAdminService;

    controller = new QueueAdminController(serviceInstance, loggerMock);

    jest.spyOn(ResponseHandler, 'ok');
    jest.spyOn(ResponseHandler, 'notFound');
    jest.spyOn(ResponseHandler, 'error');
  });

  describe('structural', () => {
    it('should be decorated with @injectable()', () => {
      const hasParamTypes = Reflect.hasOwnMetadata('inversify:paramtypes', QueueAdminController);
      expect(hasParamTypes).toBe(true);
    });
  });

  describe('getAllStats', () => {
    it('should return queue stats via ResponseHandler.ok', async () => {
      const stats = [{ queueName: 'scraping', counts: { waiting: 5, completed: 10 } }];
      queueAdminServiceMock.getAllQueueStats.mockResolvedValue(stats);

      const req = {} as Request;
      await controller.getAllStats(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, { queues: stats });
    });

    it('should handle empty stats', async () => {
      queueAdminServiceMock.getAllQueueStats.mockResolvedValue([]);

      const req = {} as Request;
      await controller.getAllStats(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, { queues: [] });
    });

    it('should handle errors', async () => {
      queueAdminServiceMock.getAllQueueStats.mockRejectedValue(new Error('Failed'));

      const req = {} as Request;
      await controller.getAllStats(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get queue stats', 500);
      expect(loggerMock.error).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return stats for a specific queue', async () => {
      const stats = { queueName: 'scraping', counts: { waiting: 3 } };
      queueAdminServiceMock.getQueueStats.mockResolvedValue(stats);

      const req = { params: { name: 'scraping' } } as unknown as Request;
      await controller.getStats(req, mockRes);

      expect(queueAdminServiceMock.getQueueStats).toHaveBeenCalledWith('scraping');
      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, stats);
    });

    it('should return 404 when queue not found', async () => {
      queueAdminServiceMock.getQueueStats.mockResolvedValue(null);

      const req = { params: { name: 'nonexistent' } } as unknown as Request;
      await controller.getStats(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, 'Queue not found');
    });

    it('should handle errors', async () => {
      queueAdminServiceMock.getQueueStats.mockRejectedValue(new Error('Failed'));

      const req = { params: { name: 'scraping' } } as unknown as Request;
      await controller.getStats(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get queue stats', 500);
    });
  });

  describe('getRecentJobs', () => {
    it('should return recent jobs', async () => {
      const jobs = [{ id: '1', name: 'job-a' }];
      queueAdminServiceMock.getRecentJobs.mockResolvedValue(jobs);

      const req = { params: { name: 'scraping' }, query: {} } as unknown as Request;
      await controller.getRecentJobs(req, mockRes);

      expect(queueAdminServiceMock.getRecentJobs).toHaveBeenCalledWith('scraping', 20, undefined);
      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, { jobs });
    });

    it('should pass query params for limit and status', async () => {
      queueAdminServiceMock.getRecentJobs.mockResolvedValue([]);

      const req = {
        params: { name: 'scraping' },
        query: { limit: '5', status: 'failed' },
      } as unknown as Request;
      await controller.getRecentJobs(req, mockRes);

      expect(queueAdminServiceMock.getRecentJobs).toHaveBeenCalledWith('scraping', 5, 'failed');
    });

    it('should handle empty jobs', async () => {
      queueAdminServiceMock.getRecentJobs.mockResolvedValue([]);

      const req = { params: { name: 'scraping' }, query: {} } as unknown as Request;
      await controller.getRecentJobs(req, mockRes);

      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, { jobs: [] });
    });

    it('should handle errors', async () => {
      queueAdminServiceMock.getRecentJobs.mockRejectedValue(new Error('Failed'));

      const req = { params: { name: 'scraping' }, query: {} } as unknown as Request;
      await controller.getRecentJobs(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get recent jobs', 500);
    });
  });

  describe('getJobDetail', () => {
    it('should return job detail', async () => {
      const job = { id: 'job-123', name: 'scrape-product' };
      queueAdminServiceMock.getJobDetail.mockResolvedValue(job);

      const req = { params: { name: 'scraping', id: 'job-123' } } as unknown as Request;
      await controller.getJobDetail(req, mockRes);

      expect(queueAdminServiceMock.getJobDetail).toHaveBeenCalledWith('scraping', 'job-123');
      expect(ResponseHandler.ok).toHaveBeenCalledWith(mockRes, job);
    });

    it('should return 404 when job not found', async () => {
      queueAdminServiceMock.getJobDetail.mockResolvedValue(null);

      const req = { params: { name: 'scraping', id: 'job-123' } } as unknown as Request;
      await controller.getJobDetail(req, mockRes);

      expect(ResponseHandler.notFound).toHaveBeenCalledWith(mockRes, 'Job not found');
    });

    it('should handle errors', async () => {
      queueAdminServiceMock.getJobDetail.mockRejectedValue(new Error('Failed'));

      const req = { params: { name: 'scraping', id: 'job-123' } } as unknown as Request;
      await controller.getJobDetail(req, mockRes);

      expect(ResponseHandler.error).toHaveBeenCalledWith(mockRes, 'Failed to get job detail', 500);
    });
  });
});
