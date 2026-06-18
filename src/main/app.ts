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

    server.setErrorConfig(app => {
      app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof Error) {
          return ResponseHandler.error(res, 'Sorry, we have presented internal problems');
        }
        next();
      });
      app.use((_req: Request, res: Response) => {
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
}

export default App;
