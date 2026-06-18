import { injectable } from 'inversify';
import { IQueueAdapter } from '@shared/queue/port/queue-adapter.interfaces';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { QUEUE_BACKEND, QueueBackendName } from '@shared/queue/queue.types';

/**
 * Inversify-friendly registry that resolves a queue adapter by backend name.
 * The current backend is determined by the QUEUE_BACKEND env var and is
 * resolved once at construction time; if you need runtime switching you
 * should use {@link IQueueAdapterRegistry.get} with a specific backend.
 */
@injectable()
export class QueueAdapterRegistry implements IQueueAdapterRegistry {
  private readonly adapters: Map<QueueBackendName, IQueueAdapter>;
  private readonly currentBackend: QueueBackendName;

  public constructor(bullmq: IQueueAdapter, sqs: IQueueAdapter, mock: IQueueAdapter, currentBackend?: QueueBackendName) {
    this.adapters = new Map<QueueBackendName, IQueueAdapter>([
      [QUEUE_BACKEND.BULLMQ, bullmq],
      [QUEUE_BACKEND.SQS, sqs],
      [QUEUE_BACKEND.MOCK, mock],
    ]);
    this.currentBackend = currentBackend ?? (process.env.QUEUE_BACKEND as QueueBackendName) ?? QUEUE_BACKEND.BULLMQ;

    if (!this.adapters.has(this.currentBackend)) {
      throw new Error(`Unknown QUEUE_BACKEND: ${this.currentBackend}`);
    }
  }

  public getCurrent(): IQueueAdapter {
    const adapter = this.adapters.get(this.currentBackend);
    if (!adapter) {
      throw new Error(`No adapter registered for backend "${this.currentBackend}"`);
    }
    return adapter;
  }

  public get(backend: 'bullmq' | 'sqs' | 'mock'): IQueueAdapter {
    const adapter = this.adapters.get(backend);
    if (!adapter) {
      throw new Error(`No adapter registered for backend "${backend}"`);
    }
    return adapter;
  }
}
