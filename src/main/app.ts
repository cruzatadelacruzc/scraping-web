import express, { Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DBContext } from '@config/db-config';
import { container } from '@shared/container';
import { TYPES } from '@shared/types.container';
import cors from 'cors';
import { QueueDashboardAuthMiddleware } from '@scrapers/revolico/controllers/middleware/queue-dashboard-auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { createErrorHandler } from '@shared/errors/error-handler.middleware';
import { ILogger } from '@shared/logger.interface';
import { CONFIG } from '@config/constants';
import { initializeQueues } from '@shared/main-queues';
import { QueueDashboardService } from '@shared/queue-dashboard';
import { PgDBContext } from '@config/pg-db';
import swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from '../../swagger.json';
import { tenantInitMiddleware } from '@shared/middleware/tenant-init.middleware';
import { QueueContext } from '@shared/queue/queue-context';
import prisma from '@users/custom-prisma-client';

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

    appInstance = express();

    // Make tenant DB available to middleware
    appInstance.locals.db = _tenantDb;

    const server = new InversifyExpressServer(container);

    const logger = container.get<ILogger>(TYPES.Logger);

    server.setErrorConfig(app => {
      app.use(createErrorHandler(logger));
      app.use((_req: Request, res: Response) => {
        void _req;
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
    await container.get<QueueContext>(QueueContext).shutdown();
    await container.get<PgDBContext>(TYPES.TenantDB).end();
    await prisma.$disconnect();
  }
}

export default App;
