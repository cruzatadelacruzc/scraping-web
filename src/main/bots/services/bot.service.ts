import '@bots/utils/dns-ipv4.util';
import { inject, injectable } from 'inversify';
import { createProvider, createBot, MemoryDB, type CoreClass } from '@builderbot/bot';
import type { ProviderClass } from '@builderbot/bot';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { TelegramAdapter } from '@bots/adapters/telegram-adapter.service';
import { WhatsAppAdapter } from '@bots/adapters/whatsapp-adapter.service';
import type { IProviderAdapter } from '@bots/adapters/provider-adapter.interface';
import { resolveProviderEntry, getEnabledBotTypes } from '@bots/providers/provider-registry';
import { TenantBotContextService } from './tenant-bot-context.service';
import { LinkCodeService } from './link-code.service';
import { mainFlow } from '@bots/flows';

/** Base port for auto-detection — each bot type gets basePort + index. */
const BOT_HTTP_BASE_PORT = parseInt(process.env.BOT_HTTP_PORT ?? '3001', 10);

/** Internal record of a running bot instance. */
interface IBotInstance {
  botType: string;
  provider: ProviderClass;
  instance: CoreClass;
}

@injectable()
export class BotService {
  private _bots: IBotInstance[] = [];

  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.TelegramAdapter) private readonly _telegramAdapter: TelegramAdapter,
    @inject(TYPES.WhatsAppAdapter) private readonly _whatsappAdapter: WhatsAppAdapter,
    @inject(TYPES.TenantBotContextService) private readonly _tenantCtx: TenantBotContextService,
    @inject(TYPES.LinkCodeService) private readonly _linkCode: LinkCodeService,
  ) {
    this._log.context = BotService.name;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Creates one builderbot instance per enabled bot type. The concrete
   * provider class is resolved from {@code provider-registry.ts} via the
   * {@code BOT_<TYPE>_PROVIDER} env vars. Each bot receives a shared flow
   * tree and a provider-specific {@link IProviderAdapter} in extensions.
   */
  public async start(): Promise<void> {
    const botTypes = getEnabledBotTypes();

    if (botTypes.length === 0) {
      this._log.info('No bot providers enabled (BOT_ENABLED=none)');
      return;
    }

    for (const [index, botType] of botTypes.entries()) {
      let provider: ProviderClass | null = null;

      try {
        const entry = resolveProviderEntry(botType);
        provider = createProvider(entry.Provider, entry.buildConfig());
        const adapter = new MemoryDB();
        const providerAdapter = this._resolveAdapter(botType);
        const port = this._resolvePort(botType, index);

        const instance = await createBot(
          { flow: mainFlow, provider: provider!, database: adapter },
          {
            extensions: {
              tenantResolver: (from: string) => this._tenantCtx.resolve(botType, from),
              providerName: botType,
              providerAdapter,
              validateAndLink: (code: string, chatId: string | number) => this._linkCode.validateAndLink(code, chatId),
            },
          },
        );

        // httpServer triggers initAll → initVendor → launch().
        // If initVendor fails, clean up so the port is freed.
        try {
          instance.httpServer(port);
        } catch (vendorErr: unknown) {
          this._log.error(`Vendor init failed for "${botType}" — cleaning up port ${port}`, vendorErr as Error);

          await provider!.stop().catch(() => {
            /* best-effort */
          });
          throw vendorErr;
        }

        this._bots.push({ botType, provider: provider!, instance });
        this._log.info(`Bot "${botType}" started on port ${port}`);
      } catch (e: unknown) {
        this._log.error(`Failed to start bot "${botType}"`, e as Error);
        if (provider) {
          await provider.stop().catch(() => {
            /* best-effort */
          });
        }
      }
    }
  }

  /** Stops all running bot providers. */
  public async stop(): Promise<void> {
    for (const { botType, provider } of this._bots) {
      try {
        await provider.stop();
        this._log.info(`Bot "${botType}" stopped`);
      } catch (e: unknown) {
        this._log.error(`Error stopping bot "${botType}"`, e as Error);
      }
    }
    this._bots = [];
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Resolves the HTTP port for a bot type.
   *
   * Explicit env vars ({@code BOT_TELEGRAM_PORT}, {@code BOT_WHATSAPP_PORT})
   * take precedence. Otherwise falls back to {@code BOT_HTTP_BASE_PORT + index}.
   */
  private _resolvePort(botType: string, index: number): number {
    const envKey = botType === 'telegram' ? 'BOT_TELEGRAM_PORT' : 'BOT_WHATSAPP_PORT';
    if (process.env[envKey]) {
      return parseInt(process.env[envKey]!, 10);
    }
    return BOT_HTTP_BASE_PORT + index;
  }

  /** Returns the correct {@link IProviderAdapter} for the given bot type. */
  private _resolveAdapter(botType: string): IProviderAdapter {
    if (botType === 'telegram') return this._telegramAdapter;
    if (botType === 'whatsapp') return this._whatsappAdapter;
    throw new Error(`Unknown bot type: ${botType}`);
  }
}
