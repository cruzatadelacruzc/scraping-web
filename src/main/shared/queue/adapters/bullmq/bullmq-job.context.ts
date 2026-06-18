import { Job as BullMQJob } from 'bullmq';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';

/**
 * Wraps a BullMQ {@link BullMQJob} in a backend-agnostic {@link IJobContext}
 * so that business handlers never import from the `bullmq` package.
 */
export class BullMQJobContext<TData = unknown> implements IJobContext<TData> {
  public readonly id: string;
  public readonly name: string;
  public readonly data: TData;
  public readonly attemptsMade: number;

  public constructor(private readonly job: BullMQJob<TData>) {
    this.id = String(job.id ?? '');
    this.name = job.name;
    this.data = job.data;
    this.attemptsMade = job.attemptsMade;
  }

  public async log(message: string): Promise<void> {
    await this.job.log(message);
  }

  public async progress(value: number | object): Promise<void> {
    await this.job.updateProgress(value);
  }

  /** Exposed for tests and the adapter; do not call from business code. */
  public get raw(): BullMQJob<TData> {
    return this.job;
  }
}
