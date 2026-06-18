import { injectable } from 'inversify';
import { randomUUID } from 'crypto';
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
import { IJobContext } from '@shared/queue/port/job-context.interfaces';

interface IMockJob<TData = unknown> {
  id: string;
  name: string;
  data: TData;
  attemptsMade: number;
  maxAttempts: number;
  status: 'waiting' | 'active' | 'completed' | 'failed';
  result?: unknown;
  reason?: string;
  progress?: number | object;
  logs: string[];
}

interface IQueueState {
  workers: Array<{ handler: JobHandler<unknown, unknown>; options?: IWorkerOptions }>;
  completedListeners: Array<CompletedListener<unknown>>;
  failedListeners: Array<FailedListener>;
  progressListeners: Array<ProgressListener>;
}

interface IMockJobContext<TData> extends IJobContext<TData> {
  readonly attemptsMade: number;
  /** Internal — used by the adapter to enqueue a retry. */
  __retry: (nextDelayMs?: number) => Promise<void>;
}

/**
 * In-memory queue adapter used in tests and for local development without
 * Redis. Jobs are processed synchronously inside `enqueue` (the simplest
 * possible semantics). If you need delayed jobs, retries, or concurrency
 * control in tests, prefer the BullMQ adapter against a real Redis.
 */
@injectable()
export class MockQueueAdapter implements IQueueAdapter {
  public readonly backend = 'mock' as const;

  private readonly jobs: IMockJob[] = [];
  private readonly queues = new Map<string, IQueueState>();
  private shuttingDown = false;

  public async enqueue<TData>(queueName: string, data: TData, opts?: IQueueEnqueueOptions): Promise<string> {
    if (this.shuttingDown) {
      throw new Error('MockQueueAdapter is shutting down; cannot enqueue');
    }

    const state = this.queues.get(queueName);
    if (!state || state.workers.length === 0) {
      throw new Error(`No worker registered for queue "${queueName}"`);
    }

    const job: IMockJob<TData> = {
      id: opts?.jobId ?? randomUUID(),
      name: opts?.name ?? '__default__',
      data,
      attemptsMade: 0,
      maxAttempts: opts?.attempts ?? 1,
      status: 'waiting',
      logs: [],
    };
    this.jobs.push(job as IMockJob);

    if (opts?.delay && opts.delay > 0) {
      setTimeout(() => {
        if (!this.shuttingDown) {
          void this.processJob(queueName, job as IMockJob);
        }
      }, opts.delay);
    } else {
      void this.processJob(queueName, job as IMockJob);
    }

    return job.id;
  }

  public registerWorker<TData, TResult>(queueName: string, handler: JobHandler<TData, TResult>, opts?: IWorkerOptions): void {
    const state = this.queues.get(queueName) ?? {
      workers: [],
      completedListeners: [],
      failedListeners: [],
      progressListeners: [],
    };
    state.workers.push({ handler: handler as JobHandler<unknown, unknown>, options: opts });
    this.queues.set(queueName, state);
  }

  public onCompleted<TResult = unknown>(queueName: string, listener: CompletedListener<TResult>): void {
    this.getOrCreateState(queueName).completedListeners.push(listener as CompletedListener<unknown>);
  }

  public onFailed(queueName: string, listener: FailedListener): void {
    this.getOrCreateState(queueName).failedListeners.push(listener);
  }

  public onProgress(queueName: string, listener: ProgressListener): void {
    this.getOrCreateState(queueName).progressListeners.push(listener);
  }

  public describe(): IQueueAdminMeta[] {
    return Array.from(this.queues.keys()).map(name => ({
      name,
      displayName: name,
      backend: 'mock',
    }));
  }

  public getDashboardQueues(): ReadonlyArray<IDashboardQueueInfo> {
    return [];
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.jobs.length = 0;
    this.queues.clear();
  }

  /** Test helper — returns a snapshot of all jobs seen by this adapter. */
  public getJobs(): ReadonlyArray<Readonly<IMockJob>> {
    return this.jobs.map(j => ({ ...j, logs: [...j.logs] }));
  }

  private getOrCreateState(queueName: string): IQueueState {
    let state = this.queues.get(queueName);
    if (!state) {
      state = { workers: [], completedListeners: [], failedListeners: [], progressListeners: [] };
      this.queues.set(queueName, state);
    }
    return state;
  }

  private async processJob(queueName: string, job: IMockJob): Promise<void> {
    const state = this.queues.get(queueName);
    if (!state || state.workers.length === 0) return;

    const worker = state.workers[0];
    job.status = 'active';
    job.attemptsMade += 1;

    const ctx: IMockJobContext<unknown> = {
      id: job.id,
      name: job.name,
      data: job.data,
      attemptsMade: job.attemptsMade,
      log: async (message: string) => {
        job.logs.push(message);
      },
      progress: async (value: number | object) => {
        job.progress = value;
        const event: IQueueProgressEvent = { jobId: job.id, data: value };
        await Promise.all(state.progressListeners.map(l => Promise.resolve(l(event))));
      },
      __retry: async (nextDelayMs?: number) => {
        if (this.shuttingDown) return;
        if (nextDelayMs && nextDelayMs > 0) {
          setTimeout(() => {
            if (!this.shuttingDown) void this.processJob(queueName, job);
          }, nextDelayMs);
        } else {
          await this.processJob(queueName, job);
        }
      },
    };

    try {
      const result = await worker.handler(ctx);
      job.status = 'completed';
      job.result = result;
      const event: IQueueCompletedEvent<unknown> = { jobId: job.id, name: job.name, result, data: job.data };
      await Promise.all(state.completedListeners.map(l => Promise.resolve(l(event))));
    } catch (err) {
      if (job.attemptsMade < job.maxAttempts) {
        const backoff = (job as any).__opts?.backoff ?? 0;
        await ctx.__retry(typeof backoff === 'number' ? backoff : 0);
        return;
      }
      job.status = 'failed';
      job.reason = err instanceof Error ? err.message : String(err);
      const event: IQueueFailedEvent = { jobId: job.id, name: job.name, reason: job.reason, data: job.data };
      await Promise.all(state.failedListeners.map(l => Promise.resolve(l(event))));
    }
  }
}
