import { injectable } from 'inversify';
import {
  CompletedListener,
  IDashboardQueueInfo,
  FailedListener,
  IQueueAdapter,
  JobHandler,
  ProgressListener,
  IQueueAdminMeta,
  IQueueEnqueueOptions,
  IWorkerOptions,
} from '@shared/queue/port/queue-adapter.interfaces';

/**
 * SQS adapter stub. Only {@link IQueueAdapter.describe} is implemented; every
 * other method throws a {@link NotImplementedError} so that the rest of the
 * app can boot with `QUEUE_BACKEND=sqs` for wiring/integration tests without
 * a real AWS account.
 *
 * The follow-up PR will pick the AWS SDK (`@aws-sdk/client-sqs` v3) and
 * flesh out `enqueue`, `registerWorker`, the listener API, and shutdown.
 */
export class NotImplementedError extends Error {
  public constructor(method: string) {
    super(`SQSQueueAdapter.${method} is not implemented yet`);
    this.name = 'NotImplementedError';
  }
}

@injectable()
export class SQSQueueAdapter implements IQueueAdapter {
  public readonly backend = 'sqs' as const;
  private readonly registeredQueues = new Set<string>();

  public async enqueue<TData>(_queueName: string, _data: TData, _opts?: IQueueEnqueueOptions): Promise<string> {
    throw new NotImplementedError('enqueue');
  }

  public registerWorker<TData, TResult>(queueName: string, _handler: JobHandler<TData, TResult>, _opts?: IWorkerOptions): void {
    this.registeredQueues.add(queueName);
  }

  public onCompleted<TResult = unknown>(_queueName: string, _listener: CompletedListener<TResult>): void {
    // listeners are wired in a follow-up; intentional no-op
  }

  public onFailed(_queueName: string, _listener: FailedListener): void {
    // no-op
  }

  public onProgress(_queueName: string, _listener: ProgressListener): void {
    // no-op
  }

  public describe(): IQueueAdminMeta[] {
    return Array.from(this.registeredQueues).map(name => ({
      name,
      displayName: name,
      backend: 'sqs',
    }));
  }

  public getDashboardQueues(): ReadonlyArray<IDashboardQueueInfo> {
    return [];
  }

  public async shutdown(): Promise<void> {
    this.registeredQueues.clear();
  }
}
