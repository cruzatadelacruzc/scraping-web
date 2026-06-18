import { IJobContext } from './job-context.interfaces';

/**
 * Handler executed by a worker for a given queue.
 */
export type JobHandler<TData = unknown, TResult = unknown> = (ctx: IJobContext<TData>) => Promise<TResult>;

/**
 * Options accepted by {@link IQueueAdapter.enqueue}.
 */
export interface IQueueEnqueueOptions {
  /** Number of attempts before the job is moved to failed. */
  attempts?: number;
  /** Backoff in ms between retries (or a BullMQ backoff expression object). */
  backoff?: number | { type: 'fixed' | 'exponential'; delay: number };
  /** Delay before the job becomes processable, in ms. */
  delay?: number;
  /** Free-form job name. */
  name?: string;
  /** Custom job id (useful for deduplication). */
  jobId?: string;
}

/**
 * Options accepted by {@link IQueueAdapter.registerWorker}.
 */
export interface IWorkerOptions {
  /** Max number of jobs processed in parallel by this worker. */
  concurrency?: number;
}

/**
 * Event payload emitted by a queue adapter for completed jobs.
 * The adapter is responsible for filling in `data` and `result` to keep
 * the legacy contract used by existing listeners.
 */
export interface IQueueCompletedEvent<TResult = unknown> {
  jobId: string;
  name?: string;
  result?: TResult;
  data?: unknown;
}

/**
 * Event payload emitted by a queue adapter for failed jobs.
 */
export interface IQueueFailedEvent {
  jobId: string;
  name?: string;
  reason: string;
  data?: unknown;
}

/**
 * Event payload emitted by a queue adapter for progress updates.
 */
export interface IQueueProgressEvent {
  jobId: string;
  data: number | object | string | boolean;
}

export type CompletedListener<TResult = unknown> = (event: IQueueCompletedEvent<TResult>) => void | Promise<void>;
export type FailedListener = (event: IQueueFailedEvent) => void | Promise<void>;
export type ProgressListener = (event: IQueueProgressEvent) => void | Promise<void>;

/**
 * Admin metadata returned by {@link IQueueAdapter.describe} for dashboards.
 */
export interface IQueueAdminMeta {
  name: string;
  displayName: string;
  backend: 'bullmq' | 'sqs' | 'mock';
}

/**
 * A registered queue exposed to backend-specific dashboards (e.g. Bull-Board
 * for BullMQ). The `queue` field is the raw backend object — it is typed as
 * `unknown` to keep this port backend-agnostic; the dashboard implementation
 * narrows it where needed.
 */
export interface IDashboardQueueInfo {
  name: string;
  queue: unknown;
}

/**
 * Backend-agnostic queue contract. Adapters (BullMQ, SQS, Mock, ...) implement
 * this interface and the rest of the app talks to it through Inversify.
 */
export interface IQueueAdapter {
  readonly backend: 'bullmq' | 'sqs' | 'mock';

  /**
   * Enqueue a job on a queue. Returns the backend-assigned job id.
   */
  enqueue<TData>(queueName: string, data: TData, opts?: IQueueEnqueueOptions): Promise<string>;

  /**
   * Register a worker for a queue. Re-registering replaces the previous
   * handler for the same queue name.
   */
  registerWorker<TData, TResult>(queueName: string, handler: JobHandler<TData, TResult>, opts?: IWorkerOptions): void;

  /**
   * Subscribe to completion events emitted by any worker on the queue.
   */
  onCompleted<TResult = unknown>(queueName: string, listener: CompletedListener<TResult>): void;

  /**
   * Subscribe to failure events emitted by any worker on the queue.
   */
  onFailed(queueName: string, listener: FailedListener): void;

  /**
   * Subscribe to progress events for a queue.
   */
  onProgress(queueName: string, listener: ProgressListener): void;

  /**
   * Returns admin metadata for every registered queue (used by dashboards).
   */
  describe(): IQueueAdminMeta[];

  /**
   * Returns the registered queues wrapped with their backend-specific raw
   * queue objects. Only adapters that have a native dashboard (BullMQ →
   * `@bull-board`) need to return a non-empty array; Mock and SQS return
   * `[]`. The dashboard service uses this to build the UI.
   */
  getDashboardQueues(): ReadonlyArray<IDashboardQueueInfo>;

  /**
   * Graceful shutdown — stops all workers and closes any open connections.
   */
  shutdown(): Promise<void>;
}
