import { inject, injectable } from 'inversify';
import { Job as BullMQJob, Queue, Worker, BackoffOptions } from 'bullmq';
import {
  CompletedListener,
  IDashboardQueueInfo,
  FailedListener,
  IQueueAdapter,
  JobHandler,
  ProgressListener,
  IQueueAdminMeta,
  IQueueCompletedEvent,
  IQueueEnqueueOptions,
  IQueueFailedEvent,
  IQueueProgressEvent,
  IWorkerOptions,
} from '@shared/queue/port/queue-adapter.interfaces';
import { buildBullMQConnection } from './bullmq-connection';
import { BullMQJobContext } from './bullmq-job.context';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

interface IQueueBundle {
  queue: Queue;
  worker?: Worker;
  completedListeners: Array<CompletedListener<unknown>>;
  failedListeners: Array<FailedListener>;
  progressListeners: Array<ProgressListener>;
}

const DEFAULT_PREFIX = 'bullmq';

/**
 * BullMQ-backed implementation of {@link IQueueAdapter}. One {@link Queue}
 * (producer) is created per queue name; at most one {@link Worker} (consumer)
 * is registered per queue. Worker events are bridged to the public listener
 * API so that listeners retain access to `job.data` and `returnvalue`.
 *
 * `maxRetriesPerRequest` is set to `null` on the worker connection per
 * BullMQ requirements, and to `1` on the producer connection so that HTTP
 * callers fail fast when Redis is unavailable.
 */
@injectable()
export class BullMQQueueAdapter implements IQueueAdapter {
  public readonly backend = 'bullmq' as const;

  private readonly bundles = new Map<string, IQueueBundle>();
  private readonly prefix: string;
  private shuttingDown = false;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = BullMQQueueAdapter.name;
    this.prefix = process.env.BULLMQ_PREFIX ?? DEFAULT_PREFIX;
  }

  public async enqueue<TData>(queueName: string, data: TData, opts?: IQueueEnqueueOptions): Promise<string> {
    if (this.shuttingDown) {
      throw new Error('BullMQQueueAdapter is shutting down; cannot enqueue');
    }
    const { queue } = this.getOrCreateBundle(queueName);

    const job = await queue.add(opts?.name ?? '__default__', data, {
      attempts: opts?.attempts,
      backoff: this.normalizeBackoff(opts?.backoff),
      delay: opts?.delay,
      jobId: opts?.jobId,
    });

    return String(job.id);
  }

  public registerWorker<TData, TResult>(queueName: string, handler: JobHandler<TData, TResult>, opts?: IWorkerOptions): void {
    if (this.shuttingDown) {
      throw new Error('BullMQQueueAdapter is shutting down; cannot register workers');
    }
    const bundle = this.getOrCreateBundle(queueName);

    if (bundle.worker) {
      throw new Error(`A worker is already registered for queue "${queueName}"`);
    }

    const worker = new Worker<TData, TResult>(
      queueName,
      async (job: BullMQJob<TData>) => {
        const ctx = new BullMQJobContext<TData>(job);
        return handler(ctx);
      },
      {
        connection: buildBullMQConnection({ forWorker: true }),
        prefix: this.prefix,
        concurrency: opts?.concurrency ?? 1,
      },
    );

    worker.on('error', err => {
      // BullMQ throws if no error handler is attached; logging is the
      // app's responsibility (subscribe via onFailed / container logger).
      this._log.error(`[BullMQQueueAdapter] worker error on queue "${queueName}": ${err instanceof Error ? err.message : String(err)}`, {
        queueName,
        stack: err instanceof Error ? err.stack : undefined,
      });
    });

    worker.on('completed', (job: BullMQJob<TData>, returnvalue: TResult) => {
      const b = this.bundles.get(queueName);
      if (!b) return;
      const event: IQueueCompletedEvent<TResult> = {
        jobId: String(job.id),
        name: job.name,
        result: returnvalue,
        data: job.data,
      };
      void Promise.all(b.completedListeners.map(l => Promise.resolve(l(event))));
    });

    worker.on('failed', (job: BullMQJob<TData> | undefined, err: Error) => {
      const b = this.bundles.get(queueName);
      if (!b) return;
      const event: IQueueFailedEvent = {
        jobId: job ? String(job.id) : '',
        name: job?.name,
        reason: err?.message ?? String(err),
        data: job?.data,
        error: err,
      };
      void Promise.all(b.failedListeners.map(l => Promise.resolve(l(event))));
    });

    worker.on('progress', (job: BullMQJob<TData>, progress: string | boolean | number | object) => {
      const b = this.bundles.get(queueName);
      if (!b) return;
      const event: IQueueProgressEvent = { jobId: String(job.id), data: progress };
      void Promise.all(b.progressListeners.map(l => Promise.resolve(l(event))));
    });

    bundle.worker = worker;
  }

  public onCompleted<TResult = unknown>(queueName: string, listener: CompletedListener<TResult>): void {
    const bundle = this.getOrCreateBundle(queueName);
    bundle.completedListeners.push(listener as CompletedListener<unknown>);
  }

  public onFailed(queueName: string, listener: FailedListener): void {
    const bundle = this.getOrCreateBundle(queueName);
    bundle.failedListeners.push(listener);
  }

  public onProgress(queueName: string, listener: ProgressListener): void {
    const bundle = this.getOrCreateBundle(queueName);
    bundle.progressListeners.push(listener);
  }

  public describe(): IQueueAdminMeta[] {
    return Array.from(this.bundles.keys()).map(name => ({
      name,
      displayName: name,
      backend: 'bullmq',
    }));
  }

  public getDashboardQueues(): ReadonlyArray<IDashboardQueueInfo> {
    return Array.from(this.bundles.entries()).map(([name, bundle]) => ({
      name,
      queue: bundle.queue,
    }));
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    const bundles = Array.from(this.bundles.values());
    this.bundles.clear();
    await Promise.all(
      bundles.map(async b => {
        if (b.worker) await b.worker.close();
        await b.queue.close();
      }),
    );
  }

  /**
   * Returns the underlying BullMQ {@link Queue} for a given queue name. Used
   * by the Bull-Board dashboard integration. Throws if the queue has not
   * been touched yet by this adapter.
   */
  public getRawQueue(queueName: string): Queue {
    return this.getOrCreateBundle(queueName).queue;
  }

  private getOrCreateBundle(queueName: string): IQueueBundle {
    let bundle = this.bundles.get(queueName);
    if (bundle) return bundle;

    const queue = new Queue(queueName, {
      connection: buildBullMQConnection({ forWorker: false }),
      prefix: this.prefix,
    });

    bundle = { queue, completedListeners: [], failedListeners: [], progressListeners: [] };
    this.bundles.set(queueName, bundle);
    return bundle;
  }

  private normalizeBackoff(b: IQueueEnqueueOptions['backoff']): BackoffOptions | undefined {
    if (b == null) return undefined;
    if (typeof b === 'number') return { type: 'fixed', delay: b };
    return { type: b.type, delay: b.delay };
  }
}
