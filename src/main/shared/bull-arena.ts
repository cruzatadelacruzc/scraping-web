import { QContext } from '@config/queue.config';
import { inject, injectable } from 'inversify';
import { ILogger } from './logger.interfaces';
import { TYPES } from './types.container';
import Arena from 'bull-arena';
import Bull from 'bull';
import { CONFIG } from '@config/constants';
import { getQueueModules } from '@shared/main-queues';

export interface IArenaQueueConfig {
  name: string;
  hostId: string;
  type: 'bull' | 'bee';
  redis: {
    host: string;
    port: number;
  };
}
@injectable()
export class BullArenaService {
  private _config: any;

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(QContext) private readonly _qContext: QContext,
  ) {
    this._log.context = BullArenaService.name;
  }

  /**
   * Sets up Bull Arena with the initial queues.
   * This method uses the queues provided by MainQueues.
   *
   * @returns {void}
   */
  public setupBullArena(): void {
    const queueModules = getQueueModules();

    const initialQueues = queueModules.map(module => {
      const moduleName = module.getModuleNmame();
      this._log.info(`Adding queues from ${moduleName} module`);
      return module.getQueuesToInitialize().map(queueName => ({
        name: queueName,
        hostId: moduleName,
        type: 'bull',
        redis: this._qContext.getQueue(queueName).client,
      }));
    });

    this._config = Arena(
      {
        Bull,
        queues: initialQueues.flat(),
      },
      { basePath: CONFIG.bull_arena_url, disableListen: true },
    );
  }

  /**
   * Returns the Express Router for Arena to integrate with the application.
   *
   */
  public get getArenaConfig(): any {
    return this._config;
  }
}
