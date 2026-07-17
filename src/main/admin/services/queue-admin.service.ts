import { injectable, inject } from 'inversify';
import { Queue, Job } from 'bullmq';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { QueueStatsDTO, JobDetailDTO } from '@admin/services/dto/queue-stats.dto';

/**
 * Service for admin-level queue introspection. Accesses BullMQ internals
 * through the QueueAdapterRegistry's getDashboardQueues() — the same
 * low-level IQueueAdapter port that QueueDashboardService uses for Bull-Board.
 *
 * For Mock and SQS backends, getDashboardQueues() returns an empty array,
 * and all methods return empty responses with a warning log. This is an
 * acknowledged leak in the queue abstraction.
 */
@injectable()
export class QueueAdminService {
  public constructor(
    @inject(TYPES.QueueAdapterRegistry) private readonly _registry: IQueueAdapterRegistry,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = QueueAdminService.name;
  }

  /**
   * Returns job counts for every registered queue.
   * @returns Array of QueueStatsDTO, one per queue.
   */
  public async getAllQueueStats(): Promise<QueueStatsDTO[]> {
    const dashboardQueues = this._registry.getCurrent().getDashboardQueues();

    if (dashboardQueues.length === 0) {
      this._log.warn('getAllQueueStats: no dashboard queues available (non-BullMQ backend or no queues registered)');
      return [];
    }

    const stats = await Promise.all(
      dashboardQueues.map(async dq => {
        const queue = dq.queue as Queue;
        const counts = await queue.getJobCounts();
        return QueueStatsDTO.from({ queueName: dq.name, counts });
      }),
    );

    return stats;
  }

  /**
   * Returns job counts for a specific queue by name.
   * @param name - The queue name.
   * @returns QueueStatsDTO or null if the queue is not found.
   */
  public async getQueueStats(name: string): Promise<QueueStatsDTO | null> {
    const dashboardQueues = this._registry.getCurrent().getDashboardQueues();
    const found = dashboardQueues.find(dq => dq.name === name);

    if (!found) {
      this._log.warn(`Queue "${name}" not found`);
      return null;
    }

    const queue = found.queue as Queue;
    const counts = await queue.getJobCounts();
    return QueueStatsDTO.from({ queueName: name, counts });
  }

  /**
   * Returns recent jobs for a specific queue.
   * @param name - The queue name.
   * @param limit - Max number of jobs to return (default 20).
   * @param status - Filter by job status ('completed', 'failed', 'active', 'waiting', 'delayed', etc.). When omitted, returns all.
   * @returns Array of JobDetailDTO.
   */
  public async getRecentJobs(name: string, limit: number = 20, status?: string): Promise<JobDetailDTO[]> {
    const dashboardQueues = this._registry.getCurrent().getDashboardQueues();
    const found = dashboardQueues.find(dq => dq.name === name);

    if (!found) {
      this._log.warn(`Queue "${name}" not found`);
      return [];
    }

    const queue = found.queue as Queue;
    const types = status ? [status as any] : undefined;
    const jobs: Job[] = await queue.getJobs(types, 0, limit - 1, false);

    return jobs.map(job => this.jobToDTO(job));
  }

  /**
   * Returns full detail for a single job.
   * @param name - The queue name.
   * @param jobId - The job ID.
   * @returns JobDetailDTO or null if the queue or job is not found.
   */
  public async getJobDetail(name: string, jobId: string): Promise<JobDetailDTO | null> {
    const dashboardQueues = this._registry.getCurrent().getDashboardQueues();
    const found = dashboardQueues.find(dq => dq.name === name);

    if (!found) {
      this._log.warn(`Queue "${name}" not found`);
      return null;
    }

    const queue = found.queue as Queue;
    const job: Job | undefined = await queue.getJob(jobId);

    if (!job) {
      return null;
    }

    return this.jobToDTO(job);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a BullMQ Job into a JobDetailDTO.
   * @param job - The BullMQ Job instance.
   * @returns A JobDetailDTO.
   */
  private jobToDTO(job: Job): JobDetailDTO {
    return JobDetailDTO.from({
      id: job.id ?? '',
      name: job.name,
      data: job.data as unknown | undefined,
      progress: job.progress as number | object | undefined,
      attemptsMade: job.attemptsMade,
      failedReason: job.failedReason ?? undefined,
      timestamp: job.timestamp ?? undefined,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
      returnValue: (job as any).returnvalue ?? undefined,
      status: (job as any)._status ?? undefined,
    });
  }
}
