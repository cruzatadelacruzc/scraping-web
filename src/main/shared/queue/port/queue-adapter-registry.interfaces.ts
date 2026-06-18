import { IQueueAdapter } from './queue-adapter.interfaces';

/**
 * Resolves the queue adapter for a given backend name. Concrete adapters are
 * registered in the Inversify container and the registry is built at startup
 * from the QUEUE_BACKEND env var.
 */
export interface IQueueAdapterRegistry {
  /**
   * Returns the adapter currently selected by the application (the value of
   * QUEUE_BACKEND at the time the container was built).
   */
  getCurrent(): IQueueAdapter;

  /**
   * Returns the adapter for a specific backend name. Throws if the backend
   * is unknown.
   */
  get(backend: 'bullmq' | 'sqs' | 'mock'): IQueueAdapter;
}
