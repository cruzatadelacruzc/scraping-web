import { Queue } from 'bull';
import { inject, injectable } from 'inversify';
import { createBullBoard } from '@bull-board/api';
import { ExpressAdapter } from '@bull-board/express';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { CONFIG } from '@config/constants';
import { QContext } from '@config/queue.config';

@injectable()
export class BullBoardService {
  private readonly _bullBoard: ReturnType<typeof createBullBoard>;
  private readonly _serverAdapter: ExpressAdapter;

  constructor(@inject(QContext) private readonly qContext: QContext) {
    this._serverAdapter = new ExpressAdapter();
    this._serverAdapter.setBasePath(CONFIG.bull_board_url);
    this._bullBoard = createBullBoard({ queues: [], serverAdapter: this._serverAdapter });
  }

  /**
   * Adds an existing queue for monitoring.
   * This method should be called once the queue is created.
   *
   * @param queueName - The name of the queue to be added for monitoring.
   */
  addQueueForMonitoring(queueName: string) {
    const queue = this.qContext.getQueue(queueName);
    if (!queue) {
      throw new Error(`Queue "${queueName}" not found in QContext.`);
    }

    this._bullBoard.addQueue(new BullAdapter(queue));
    console.log(`Queue "${queueName}" added to BullBoard for monitoring.`);
  }

  /**
   * Returns the configured BullBoard adapter for integration with Express.
   *
   * @returns {ExpressAdapter} - The BullBoard server adapter.
   */
  public getServerAdapter(): ExpressAdapter {
    return this._serverAdapter;
  }
}
