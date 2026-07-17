/**
 * Minimal type declarations for `node-cron` v3.
 *
 * The package ships with no bundled types and there is no
 * `@types/node-cron`.  This declaration covers the subset of the
 * public API used by the project.
 */
declare module 'node-cron' {
  interface IScheduledTask {
    start(): void;
    stop(): void;
  }

  /**
   * Creates a scheduled task.
   *
   * @param expression  Cron expression (e.g. "every 5 minutes" = `"/5 * * * *"`).
   * @param func        Callback invoked when the cron expression fires.
   * @param options     `scheduled: false` creates a paused task; `timezone`
   *                    sets the timezone for the expression.
   */
  function schedule(expression: string, func: () => void, options?: { scheduled?: boolean; timezone?: string }): IScheduledTask;
}
