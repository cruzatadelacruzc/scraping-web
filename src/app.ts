import express from 'express';
import { InversifyExpressServer } from 'inversify-express-utils';
import { DBContext } from '@config/db-config';
import { container } from '@shared/container';
import cors from 'cors';
const PORT = process.env.PORT || 3000;

export class App {
  async setup() {
    const _db = container.get(DBContext);

    _db.dbConnect();

    const server = new InversifyExpressServer(container);
    server
      .setConfig(app => {
        app.use(express.json());
        app.use(cors());
      })
      .build()
      .listen(PORT, () => console.log(`Server listening on port ${PORT}`));
  }
}
