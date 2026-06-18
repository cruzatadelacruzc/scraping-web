import { IJobContext } from '@shared/queue/port/job-context.interfaces';

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
   * Returns a processor function for the specified queue. Implementations
   * may specialise the generic `IJobContext` parameter; the runtime
   * contract is the same regardless.
   * @param {string} queueName The name of the queue.
   * @returns {(ctx: IJobContext<any>) => Promise<any>} A function that takes a backend-agnostic job context and returns a promise.
   * @throws {Error} If no processor is defined for the specified queue.
   */
  getProcessor(queueName: string): (ctx: IJobContext<any>) => Promise<any>;

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
