import express, { Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DBContext } from '@config/db-config';
import { container } from '@shared/container';
import cors from 'cors';
import { QueueDashboardAuthMiddleware } from '@scrapers/revolico/controllers/middleware/bull-dashboard-auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { CONFIG } from '@config/constants';
import { initializeQueues } from '@shared/main-queues';
import { BullArenaService } from '@shared/bull-arena';
const PORT = process.env.PORT || 3000;

export class App {
  public async setup(): Promise<void> {
    const _db = container.get(DBContext);
    const _bullArena = container.get(BullArenaService);

    await initializeQueues();
    _bullArena.setupBullArena();
    await _db.dbConnect();

    const server = new InversifyExpressServer(container);

    server.setErrorConfig(app => {
      app.use((error: Error, req: Request, res: Response) => {
        if (error instanceof Error) {
          return ResponseHandler.error(res, 'Sorry, we have presented internal problems');
        }
      });
    });

    server
      .setConfig(app => {
        app.use(express.json());
        app.use(cors());
        app.use('/queue', QueueDashboardAuthMiddleware.authenticate(), _bullArena.getArenaConfig);
      })
      .build()
      .listen(PORT, () =>
        console.log(`
          Server listening on port ${PORT}
          Bull Arena is available on path ${CONFIG.bull_arena_url}
        `),
      );
  }
}
