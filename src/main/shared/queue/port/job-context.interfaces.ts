/**
 * Job context exposed to queue handlers. Backend-agnostic; BullMQ/SQS/Mock
 * implementations wrap their native job types into this interface so that
 * business code never imports a queue-specific library.
 */
export interface IJobContext<TData = unknown> {
  /**
   * Unique job identifier assigned by the queue backend.
   */
  readonly id: string;

  /**
   * Job name (BullMQ concept; defaults to the queue default in SQS/Mock).
   */
  readonly name: string;

  /**
   * Payload delivered to the job when it was enqueued.
   */
  readonly data: TData;

  /**
   * Number of times this job has been attempted (0 on first run).
   */
  readonly attemptsMade: number;

  /**
   * Append a free-form log line. Returned Promise resolves when the log
   * is durably persisted by the backend.
   */
  log(message: string): Promise<void>;

  /**
   * Report progress (0-100) or a structured object. Resolves once the
   * backend has stored the progress value.
   */
  progress(value: number | object): Promise<void>;
}
