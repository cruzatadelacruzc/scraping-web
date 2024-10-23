import { Job } from 'bull';

export interface IQueueModule {
  /**
   * Returns the name of the module.
   * @returns {string} The name of the module.
   */
  getModuleNmame(): string;

  /**
   * Returns an array of queue names that need to be initialized.
   * @returns {string[]} An array of queue names.
   */
  getQueuesToInitialize(): string[];

  /**
   * Returns a processor function for the specified queue.
   * @param {string} queueName The name of the queue.
   * @returns {(job: Job) => Promise<any>} A function that takes a job and returns a promise that resolves to any type.
   * @throws {Error} If no processor is defined for the specified queue.
   */
  getProcessor(queueName: string): (job: Job) => Promise<any>;

  /**
   * Configures the event listeners for the queues within the module.
   * This method is responsible for setting up any required listeners for
   * queue events such as 'completed', 'failed', or others.
   *
   * It should be called after initializing the queues to ensure that all
   * relevant events are being tracked and handled appropriately.
   *
   */
  setupQueueListeners(): void;
}
