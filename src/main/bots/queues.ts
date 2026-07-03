import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { IQueueModule } from '@shared/queue-module.interface';
import { IJobContext } from '@shared/queue/port/job-context.interfaces';

export const BOT_OUTBOUND_SEND = 'BOT_OUTBOUND_SEND';

export interface IBotOutboundJob {
  provider: string;
  externalId: string;
  text: string;
}

@injectable()
export class BotQueues implements IQueueModule {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = BotQueues.name;
  }

  public getModuleNmame(): string {
    return 'BotQueues';
  }

  public getQueuesToInitialize(): string[] {
    return [BOT_OUTBOUND_SEND];
  }

  public getProcessor(queueName: string): (ctx: IJobContext<any>) => Promise<any> {
    if (queueName === BOT_OUTBOUND_SEND) {
      return this._processOutbound.bind(this);
    }
    throw new Error(`Unknown queue: ${queueName}`);
  }

  public setupQueueListeners(): void {
    this._log.info('Bot queues registered');
  }

  private async _processOutbound(ctx: IJobContext<IBotOutboundJob>): Promise<void> {
    const data = ctx.data;
    this._log.debug('Processing outbound message', { provider: data.provider, externalId: data.externalId });
    // The actual send is handled by the BotService which has access to the
    // provider instances. This queue ensures retries and backpressure.
    // TODO: wire to provider.sendText() via BotService injected callback
  }
}
