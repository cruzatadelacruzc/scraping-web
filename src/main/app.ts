import express, { NextFunction, Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DBContext } from '@config/db-config';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import cors from 'cors';
import { QueueDashboardAuthMiddleware } from '@scrapers/revolico/controllers/middleware/queue-dashboard-auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { CONFIG } from '@config/constants';
import { initializeQueues } from '@shared/main-queues';
import { QueueDashboardService } from '@shared/queue-dashboard';
import { PgDBContext } from '@config/pg-db';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../../swagger.json';
import { tenantInitMiddleware } from '@shared/middleware/tenant-init.middleware';
import { QueueContext } from '@shared/queue/queue-context';
import prisma from '@users/custom-prisma-client';
import { BotService } from '@bots/services/bot.service';
import { LinkCodeService } from '@bots/services/link-code.service';
import { BotRateLimitService } from '@bots/services/rate-limit.service';

const PORT = process.env.PORT || 3000;

let appInstance: express.Application | undefined;

export class App {
  public async setup(): Promise<express.Application> {
    const _db = container.get(DBContext);
    const _tenantDb = container.get<PgDBContext>(TYPES.TenantDB);
    const _dashboard = container.get<QueueDashboardService>(TYPES.QueueDashboardService);

    await initializeQueues();
    _dashboard.setup();
    await _db.dbConnect();
    await _tenantDb.dbConnect();

    // Start bot providers if enabled
    const botService = container.get<BotService>(TYPES.BotService);
    await botService.start();

    appInstance = express();

    // Make tenant DB available to middleware
    appInstance.locals.db = _tenantDb;

    const server = new InversifyExpressServer(container);

    server.setErrorConfig(app => {
      app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof Error) {
          console.error('[GlobalErrorHandler]', error.message, error.stack?.split('\n').slice(0, 5).join('\n'));
          return ResponseHandler.error(res, 'Sorry, we have presented internal problems');
        }
        next();
      });
      app.use((req: Request, res: Response) => {
        void req;
        ResponseHandler.notFound(res);
      });
    });

    appInstance = server
      .setConfig(app => {
        app.use(tenantInitMiddleware);
        app.use(express.json());
        app.use(cors());
        app.use(CONFIG.queue_dashboard_url, QueueDashboardAuthMiddleware.authenticate(), _dashboard.getRouter());
        app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
      })
      .build();

    if (process.env.NODE_ENV !== 'test') {
      appInstance.listen(PORT, () =>
        console.log(`\nServer listening on port ${PORT}\nQueue Dashboard is available on path ${CONFIG.queue_dashboard_url}\n`),
      );
    }
    return appInstance;
  }

  /**
   * Graceful shutdown — mirror of {@link setup}. Closes every BullMQ worker
   * and queue opened during `initializeQueues()`, then drains and ends the
   * tenant PostgreSQL pool. Idempotent: safe to call more than once.
   *
   * Call this from test `afterAll` hooks that invoked `setup()`, and as a
   * SIGTERM handler in production.
   */
  public async close(): Promise<void> {
    await container.get<BotService>(TYPES.BotService).stop();
    await container.get<QueueContext>(QueueContext).shutdown();
    await container.get<PgDBContext>(TYPES.TenantDB).end();
    await prisma.$disconnect();

    // Close Redis connections opened by bot services so Jest can exit cleanly.
    // `destroy()` is best-effort — failures are logged but never re-thrown.
    container
      .get<LinkCodeService>(TYPES.LinkCodeService)
      .destroy()
      .catch(() => {});
    container
      .get<BotRateLimitService>(TYPES.BotRateLimitService)
      .destroy()
      .catch(() => {});
  }
}

export default App;
