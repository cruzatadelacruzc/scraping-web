import { QueueContext } from '@shared/queue/queue-context';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { inject, injectable } from 'inversify';

@injectable()
export class ScrapingProductService {
  public constructor(
    @inject(QueueContext) private readonly _qContext: QueueContext,
    @inject(TYPES.Logger) private readonly _log: ILogger,
  ) {
    this._log.context = ScrapingProductService.name;
  }

  /**
   * Adds a new product info scraping job to the queue.
   *
   * @param {Array<{url: string}>} data - The data for the product scraping job.
   * @returns {Promise<string>} A promise that resolves with the job ID.
   * @throws {Error} If the job cannot be added to the queue.
   */
  public async addScrapingJob(data: { url: string }[], queueName: string): Promise<string> {
    try {
      const jobId = await this._qContext.enqueue(queueName, data, {
        attempts: 2,
        backoff: 5000,
      });

      this._log.info(`Job ID: ${jobId} added to the "${queueName}" queue`);
      return jobId;
    } catch (error) {
      let message = `Failed to add job to the "${queueName}" queue`;
      if (error instanceof Error) message = `Failed to add job to the "${queueName}" queue: ${error.message}`;
      this._log.error(message);
      throw error;
    }
  }
}
