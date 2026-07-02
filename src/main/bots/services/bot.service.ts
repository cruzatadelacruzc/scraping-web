import { inject, injectable } from 'inversify';
import { createBot, MemoryDB, type CoreClass } from '@builderbot/bot';
import type { ProviderClass } from '@builderbot/bot';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { WhatsAppProvider } from '@bots/providers/whatsapp/whatsapp.provider';
import { TelegramProvider } from '@bots/providers/telegram/telegram.provider';
import { TenantBotContextService } from './tenant-bot-context.service';
import { MessageRouterService } from './message-router.service';
import { LinkCodeService } from './link-code.service';
import { mainFlow } from '@bots/flows';

/** Base port for bot HTTP servers — one per provider, each gets basePort + index. */
const BOT_HTTP_BASE_PORT = parseInt(process.env.BOT_HTTP_PORT ?? '3001', 10);

/** Internal record of a running bot instance. */
interface IBotInstance {
  name: string;
  provider: ProviderClass;
  instance: CoreClass;
}

@injectable()
export class BotService {
  private _bots: IBotInstance[] = [];

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.WhatsAppProvider) private readonly _whatsapp: WhatsAppProvider,
    @inject(TYPES.TelegramProvider) private readonly _telegram: TelegramProvider,
    @inject(TYPES.TenantBotContextService) private readonly _tenantCtx: TenantBotContextService,
    @inject(TYPES.MessageRouterService) private readonly _router: MessageRouterService,
    @inject(TYPES.LinkCodeService) private readonly _linkCode: LinkCodeService,
  ) {
    this._log.context = BotService.name;
  }

  /**
   * Creates one builderbot instance per enabled provider. Each bot
   * receives its own {@link ProviderClass} and a shared flow tree.
   * Tenant context is injected via {@link GeneralArgs.extensions}
   * so every flow can resolve its tenant on-demand.
   */
  public async start(): Promise<void> {
    const enabled = (process.env.BOT_ENABLED ?? 'none').split(',');

    const factories: Array<{ name: string; factory: { createProviderInstance(): ProviderClass } }> = [];

    if (enabled.includes('whatsapp') || enabled.includes('both')) {
      factories.push({ name: 'whatsapp', factory: this._whatsapp });
    }
    if (enabled.includes('telegram') || enabled.includes('both')) {
      factories.push({ name: 'telegram', factory: this._telegram });
    }

    if (factories.length === 0) {
      this._log.info('No bot providers enabled (BOT_ENABLED=none)');
      return;
    }

    for (const [index, { name, factory }] of factories.entries()) {
      try {
        const provider = factory.createProviderInstance();
        const adapter = new MemoryDB();

        // extensions.tenantResolver is called by flows to resolve
        // tenant context on-demand before executing gated logic.
        const instance = await createBot(
          {
            flow: mainFlow,
            provider,
            database: adapter,
          },
          {
            extensions: {
              tenantResolver: (from: string) => this._tenantCtx.resolve(name, from),
              providerName: name,
            },
          },
        );

        // httpServer triggers initAll → initVendor → launch(), which starts
        // the underlying message listener (polling for Telegram, WebSocket
        // for WhatsApp). Each provider needs a unique port.
        const port = BOT_HTTP_BASE_PORT + index;
        instance.httpServer(port);

        this._bots.push({ name, provider, instance });
        this._log.info(`Bot provider "${name}" started`);
      } catch (e: unknown) {
        this._log.error(`Failed to start bot provider "${name}"`, e as Error);
      }
    }
  }

  /** Stops all running bot providers. */
  public async stop(): Promise<void> {
    for (const { name, provider } of this._bots) {
      try {
        await provider.stop();
        this._log.info(`Bot provider "${name}" stopped`);
      } catch (e: unknown) {
        this._log.error(`Error stopping provider "${name}"`, e as Error);
      }
    }
    this._bots = [];
  }
}
