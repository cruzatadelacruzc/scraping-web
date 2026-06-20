import { inject, injectable, unmanaged } from 'inversify';
import { Router } from 'express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Queue as BullMQQueue } from 'bullmq';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IQueueAdapterRegistry } from '@shared/queue/port/queue-adapter-registry.interfaces';
import { CONFIG } from '@config/constants';

type BullBoard = ReturnType<typeof createBullBoard>;

/**
 * Express-mountable dashboard for queue backends. Built on top of
 * `@bull-board/api` (which replaces the unmaintained `bull-arena`). The
 * service introspects the active adapter (selected by
 * {@link IQueueAdapterRegistry.getCurrent}) and only registers
 * {@link BullMQAdapter} queues for the BullMQ backend — for Mock and SQS the
 * board is created empty so the dashboard still serves its UI without errors.
 *
 * Lifecycle:
 * - `setup()` is called once at boot. It wires `createBullBoard(...)` with
 *   the server adapter and the queues returned by
 *   `IQueueAdapter.getDashboardQueues()`.
 * - `getRouter()` returns the Express router produced by the
 *   {@link ExpressAdapter}. The application mounts it behind the basic-auth
 *   middleware (`QueueDashboardAuthMiddleware`).
 */
@injectable()
export class QueueDashboardService {
  public readonly basePath: string;
  private readonly serverAdapter: ExpressAdapter;
  private _board: BullBoard | null = null;
  private _initialized = false;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.QueueAdapterRegistry) private readonly _registry: IQueueAdapterRegistry,
    @unmanaged() basePath?: string,
  ) {
    this._log.context = QueueDashboardService.name;
    this.basePath = basePath ?? CONFIG.queue_dashboard_url;
    this.serverAdapter = new ExpressAdapter();
    this.serverAdapter.setBasePath(this.basePath);
  }

  /**
   * Builds the Bull-Board with the active adapter's dashboard queues. Must
   * be called exactly once; subsequent calls throw so mis-wiring fails fast.
   */
  public setup(): void {
    if (this._initialized) {
      throw new Error('QueueDashboardService is already initialized');
    }
    this._initialized = true;

    const adapter = this._registry.getCurrent();
    const backend = adapter.backend;
    const dashboardQueues = adapter.getDashboardQueues();

    const bullAdapters = dashboardQueues
      .map(info => ({ name: info.name, queue: info.queue as BullMQQueue | null }))
      .filter((info): info is { name: string; queue: BullMQQueue } => info.queue instanceof Object && 'name' in info.queue)
      .map(info => new BullMQAdapter(info.queue));

    this._board = createBullBoard({
      queues: bullAdapters as unknown as Parameters<typeof createBullBoard>[0]['queues'],
      serverAdapter: this.serverAdapter,
    });

    this._log.info(`Queue Dashboard ready (backend=${backend}, queues=${bullAdapters.length})`);
  }

  /**
   * Returns the Express router that exposes the dashboard UI and JSON API
   * under {@link basePath}. The application mounts this behind the auth
   * middleware.
   */
  public getRouter(): Router {
    return this.serverAdapter.getRouter() as Router;
  }
}
