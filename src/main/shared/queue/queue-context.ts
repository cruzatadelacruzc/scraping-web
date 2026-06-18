import { inject, injectable } from 'inversify';
import { IQueueAdapter, IQueueEnqueueOptions } from '@shared/queue/port/queue-adapter.interfaces';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { TYPES } from '@shared/types.container';

/**
 * Thin facade over the configured {@link IQueueAdapter}. The rest of the
 * application injects this class instead of touching the registry directly.
 * `enqueue` returns the backend-assigned job id; listeners and worker
 * registration go through dedicated methods on the adapter.
 */
@injectable()
export class QueueContext {
  public constructor(@inject(TYPES.QueueAdapterRegistry) private readonly _registry: IQueueAdapterRegistry) {}

  /**
   * Enqueue a job on the currently active adapter.
   */
  public async enqueue<TData>(queueName: string, data: TData, opts?: IQueueEnqueueOptions): Promise<string> {
    return this._registry.getCurrent().enqueue(queueName, data, opts);
  }

  /**
   * Returns the active adapter. Use this for advanced operations that are
   * not covered by the facade (e.g., worker registration, listeners,
   * dashboard metadata).
   */
  public getAdapter(): IQueueAdapter {
    return this._registry.getCurrent();
  }

  /**
   * Graceful shutdown of the active adapter.
   */
  public async shutdown(): Promise<void> {
    await this._registry.getCurrent().shutdown();
  }
}
