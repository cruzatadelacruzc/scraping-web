import express, { NextFunction, Request, Response } from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DBContext } from '@config/db-config';
import { container } from '@shared/container';
import cors from 'cors';
import { BullBoardAuthMiddleware } from '@scrapers/revolico/controllers/middleware/bull-board-auth.middleware';
import { ResponseHandler } from '@shared/response-handler';
import { BullBoardService } from '@shared/bull-board';
import { CONFIG } from '@config/constants';
const PORT = process.env.PORT || 3000;

export class App {
  async setup() {
    const _db = container.get(DBContext);        
    const _serverAdapter = container.get(BullBoardService);    

    await _db.dbConnect();        

    const server = new InversifyExpressServer(container);

    server.setErrorConfig(app => {
      app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
        if (error instanceof Error) {
          return ResponseHandler.error(res, 'Sorry, we have presented internal problems');
        }
      });
    });

    server
      .setConfig(app => {
        app.use(express.json());
        app.use(cors());
        app.use(CONFIG.bull_board_url, BullBoardAuthMiddleware.authenticate(), _serverAdapter.getServerAdapter().getRouter());
      })
      .build()
      .listen(PORT, () =>
        console.log(`
          Server listening on port ${PORT}
          Bull Board is available on path ${CONFIG.bull_board_url}
        `),
      );
  }
}
