import { inject, injectable } from 'inversify';
import { ScrapingSchedule } from '@prisma/client';
import cron from 'node-cron';
import { ILogger } from '@shared/logger.interface';
import { QueueContext } from '@shared/queue/queue-context';
import { StoreRegistry } from '@cron/store-registry';
import { ScheduleRepository } from '@cron/repositories/schedule.repository';
import { TYPES } from '@shared/types.container';

/**
 * Runtime cron scheduler that reads `ScrapingSchedule` rows from the database
 * and registers each enabled one with node-cron.
 *
 * On each tick the scheduler:
 * 1. Resolves the target BullMQ queue name from the {@link StoreRegistry}.
 * 2. Enqueues every job listed in the schedule's `jobs` JSON array.
 * 3. Best-effort updates the schedule's `lastRunAt` timestamp.
 *
 * Invalid cron expressions are caught and logged — they do not crash the
 * process or prevent other schedules from running.
 *
 * @example
 * ```typescript
 * const scheduler = container.get(CronSchedulerService);
 * await scheduler.initialize();
 * // Later, on shutdown:
 * scheduler.shutdown();
 * ```
 */
@injectable()
export class CronSchedulerService {
  private readonly _tasks = new Map<string, cron.IScheduledTask>();

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.ScheduleRepository) private readonly _repo: ScheduleRepository,
    @inject(TYPES.StoreRegistry) private readonly _storeRegistry: StoreRegistry,
    @inject(QueueContext) private readonly _qContext: QueueContext,
  ) {
    this._log.context = CronSchedulerService.name;
  }

  /**
   * Loads all scraping schedules from the database and registers each
   * enabled one with node-cron. Disabled schedules are skipped.
   * Idempotent — running tasks are stopped and replaced.
   */
  public async initialize(): Promise<void> {
    const schedules = await this._repo.findAll();
    this._log.info(`Initializing ${schedules.length} scraping schedule(s)`);
    for (const schedule of schedules) {
      this.register(schedule);
    }
  }

  /**
   * Registers (or re-registers) a single schedule with node-cron.
   *
   * If a task already exists for this schedule id it is stopped before the
   * new task is created. Disabled schedules are unregistered if previously
   * running and then skipped.
   *
   * An invalid cron expression is caught, logged, and does not throw.
   *
   * @param schedule - The schedule model from the database.
   */
  public register(schedule: ScrapingSchedule): void {
    this.unregister(schedule.id);

    if (!schedule.enabled) {
      this._log.info(`Schedule "${schedule.name}" (${schedule.id}) is disabled — skipping`);
      return;
    }

    try {
      this._register(schedule);
    } catch (err) {
      this._log.error(
        `Failed to register schedule "${schedule.name}" (${schedule.id}) — ` + `invalid cron expression "${schedule.cron}"`,
        err,
      );
    }
  }

  /**
   * Stops and removes the running task for the given schedule id.
   * No-op if no task is registered for that id.
   *
   * @param id - The scraping schedule id.
   */
  public unregister(id: string): void {
    const existing = this._tasks.get(id);
    if (existing) {
      existing.stop();
      this._tasks.delete(id);
      this._log.debug(`Unregistered cron task for schedule "${id}"`);
    }
  }

  /**
   * Stops all running cron tasks and clears the internal task map.
   * Idempotent — safe to call even if already stopped.
   */
  public shutdown(): void {
    this._log.info('Shutting down all cron tasks');
    for (const [id, task] of this._tasks) {
      task.stop();
      this._log.debug(`Stopped cron task for schedule "${id}"`);
    }
    this._tasks.clear();
  }

  /**
   * Creates a node-cron scheduled task and stores it in the internal map.
   * Called by {@link register} after the enabled check and after stopping
   * any previous task for the same id.
   *
   * @param schedule - The schedule to register.
   * @throws {Error} If the cron expression is syntactically invalid.
   */
  private _register(schedule: ScrapingSchedule): void {
    const task = cron.schedule(
      schedule.cron,
      async () => {
        await this._onTick(schedule);
      },
      { scheduled: true },
    );

    this._tasks.set(schedule.id, task);
    this._log.info(`Registered cron task "${schedule.name}" (${schedule.id}) — ` + `"${schedule.cron}" for store "${schedule.store}"`);
  }

  /**
   * Fired by node-cron on each tick of the schedule.
   *
   * Resolves the target queue from the store registry, enqueues every job
   * in the schedule's `jobs` array, and best-effort writes the new
   * `lastRunAt` timestamp.
   */
  private async _onTick(schedule: ScrapingSchedule): Promise<void> {
    const { id, name, store: storeKey } = schedule;

    // 1. Resolve queue name from the store registry
    let queueName: string;
    try {
      const config = this._storeRegistry.get(storeKey);
      queueName = config.scrapingQueue;
    } catch (err) {
      this._log.error(`Tick for schedule "${name}" (${id}): unknown store "${storeKey}" — skipping`, err);
      return;
    }

    // 2. Enqueue each job
    const jobs = schedule.jobs as Array<Record<string, unknown>>;

    for (let i = 0; i < jobs.length; i++) {
      try {
        await this._qContext.enqueue(queueName, jobs[i], {
          attempts: 2,
          backoff: 5000,
        });
        this._log.debug(`Enqueued job #${i} for schedule "${name}" on queue "${queueName}"`);
      } catch (err) {
        this._log.error(`Failed to enqueue job #${i} for schedule "${name}" (${id})`, err);
      }
    }

    // 3. Best-effort: persist lastRunAt — failure is non-critical
    try {
      await this._repo.updateLastRunAt(id);
    } catch {
      // silently ignored
    }
  }
}
