import { injectable } from 'inversify';
import Queue, { Queue as IQueue, Job } from 'bull';

@injectable()
export class QContext {
  private queues: Map<string, IQueue> = new Map();

  /**
   * Creates a queue connection with Redis if it doesn't already exist.
   *
   * @param {string} [queueName='scrapper_queue_list'] - The name of the queue to create.
   * @returns {Promise<Queue>} A promise that resolves when the queue is created.
   */
  public async QCreate(queueName: string, processor: (job: Job) => Promise<any>): Promise<Queue.Queue> {
    if (!this.queues.has(queueName)) {
      const queue = new Queue(queueName, { redis: process.env.REDIS_URL });

      queue.on('error', err => {
        console.error(`Redis connection error for queue "${queueName}":`, err);
      });

      queue.on('ready', () => {
        console.log(`Queue "${queueName}" is ready.`);
      });

      queue.process(processor);
      this.queues.set(queueName, queue);

      console.log(`Queue "${queueName}" created using REDIS URL ${process.env.REDIS_URL}`);
    } else {
      console.log(`Queue "${queueName}" already exists.`);
    }
    return this.getQueue(queueName);
  }

  /**
   * Retrieves the queue by name.
   * Throws an error if the queue is not found.
   *
   * @param {string} queueName - The name of the queue to retrieve.
   * @returns {IQueue} The corresponding Bull queue instance.
   * @throws {Error} If the queue does not exist.
   */
  public getQueue(queueName: string): IQueue {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" has not been created.`);
    }
    return queue;
  }
}
