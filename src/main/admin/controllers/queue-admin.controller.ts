import { Request, Response } from 'express';
import { controller, httpGet, request, response } from 'inversify-express-utils';
import { inject } from 'inversify';
import { TYPES } from '@shared/types.container';
import { AuthMiddleware } from '@shared/middleware/auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { ILogger } from '@shared/logger.interface';
import { QueueAdminService } from '@admin/services/queue-admin.service';

/**
 * SUPER_ADMIN-only controller for queue introspection.
 * Exposes aggregated job counts, recent jobs, and individual job details
 * by accessing BullMQ internals through the QueueAdapterRegistry.
 */
@controller('/api/admin/queues')
export class QueueAdminController {
  public constructor(
    @inject(TYPES.QueueAdminService) private readonly _service: QueueAdminService,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = QueueAdminController.name;
  }

  /**
   * Returns job counts for all registered queues.
   * @param req - Express request.
   * @param res - Express response.
   */
  @httpGet('/stats', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getAllStats(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const stats = await this._service.getAllQueueStats();
      ResponseHandler.ok(res, { queues: stats });
    } catch (err) {
      this._log.error('Failed to get queue stats', { error: err });
      ResponseHandler.error(res, 'Failed to get queue stats', 500);
    }
  }

  /**
   * Returns job counts for a single queue.
   * @param req - Express request with queue name in params.
   * @param res - Express response.
   */
  @httpGet('/:name/stats', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getStats(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const stats = await this._service.getQueueStats(req.params.name);
      if (!stats) {
        ResponseHandler.notFound(res, 'Queue not found');
        return;
      }
      ResponseHandler.ok(res, stats);
    } catch (err) {
      this._log.error('Failed to get queue stats', { error: err, queueName: req.params.name });
      ResponseHandler.error(res, 'Failed to get queue stats', 500);
    }
  }

  /**
   * Returns recent jobs for a queue.
   * @param req - Express request with queue name in params and optional limit/status in query.
   * @param res - Express response.
   */
  @httpGet('/:name/jobs', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getRecentJobs(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 20;
      const status = req.query.status ? String(req.query.status) : undefined;
      const jobs = await this._service.getRecentJobs(req.params.name, limit, status);
      ResponseHandler.ok(res, { jobs });
    } catch (err) {
      this._log.error('Failed to get recent jobs', { error: err, queueName: req.params.name });
      ResponseHandler.error(res, 'Failed to get recent jobs', 500);
    }
  }

  /**
   * Returns full detail for a single job.
   * @param req - Express request with queue name and job id in params.
   * @param res - Express response.
   */
  @httpGet('/:name/jobs/:id', AuthMiddleware.forRoles('SUPER_ADMIN'))
  public async getJobDetail(@request() req: Request, @response() res: Response): Promise<void> {
    try {
      const job = await this._service.getJobDetail(req.params.name, req.params.id);
      if (!job) {
        ResponseHandler.notFound(res, 'Job not found');
        return;
      }
      ResponseHandler.ok(res, job);
    } catch (err) {
      this._log.error('Failed to get job detail', {
        error: err,
        queueName: req.params.name,
        jobId: req.params.id,
      });
      ResponseHandler.error(res, 'Failed to get job detail', 500);
    }
  }
}
