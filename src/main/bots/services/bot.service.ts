import '@bots/utils/dns-ipv4.util';
import { inject, injectable } from 'inversify';
import { createProvider, createBot, MemoryDB, type CoreClass } from '@builderbot/bot';
import type { ProviderClass } from '@builderbot/bot';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { runWithRequestContext } from '@shared/tenant-context-als';
import { TelegramAdapter } from '@bots/adapters/telegram-adapter.service';
import { WhatsAppAdapter } from '@bots/adapters/whatsapp-adapter.service';
import type { IProviderAdapter } from '@bots/adapters/provider-adapter.interface';
import { resolveProviderEntry, getEnabledBotTypes } from '@bots/providers/provider-registry';
import { TenantBotContextService } from './tenant-bot-context.service';
import { LinkCodeService } from './link-code.service';
import { mainFlow } from '@bots/flows';
import { SubscriptionsService } from '@users/services/account-subscriptions.service';
import { AlarmService } from '@alarms/services/alarm.service';
import { UserRepository } from '@users/repositories/user.repository';
import { PlanService } from '@users/services/plan.service';

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
    @inject(TYPES.SubscriptionsService) private readonly _subscriptionsService: SubscriptionsService,
    @inject(TYPES.AlarmService) private readonly _alarmService: AlarmService,
    @inject(UserRepository) private readonly _userRepository: UserRepository,
    @inject(TYPES.PlanService) private readonly _planService: PlanService,
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

        // Build the extensions bag as a separate variable so provider closures
        // can share state via the same object reference across flow calls.
        const extensions: Record<string, unknown> = {
          tenantResolver: async (from: string) => {
            const botCtx = await this._tenantCtx.resolve(botType, from);
            // Store on the extensions bag so provider closures can access
            // the resolved tenant context without receiving it as a parameter.
            extensions._currentBotCtx = botCtx;
            return botCtx;
          },
          providerName: botType,
          providerAdapter,
          verifyAndLink: (token: string, chatId: string, provider: string) => this._linkCode.verifyAndLink(token, chatId, provider),
          linkCodeService: this._linkCode,

          // -----------------------------------------------------------------------
          // Extension providers for slash-command flows
          // -----------------------------------------------------------------------

          /**
           * Reads the subscription for the current linked account.
           * Returns { planName, expiresAt } or null when unsubscribed.
           */
          subscriptionProvider: async () => {
            const currentBotCtx = extensions._currentBotCtx as { accountId: string | null } | undefined;
            const accountId = currentBotCtx?.accountId;
            if (!accountId) return null;

            try {
              const subs = await this._subscriptionsService.getByAccountId(accountId);
              // Prefer the first active/trialing subscription
              const active = subs.find(s => s.status === 'ACTIVE' || s.status === 'TRIALING');
              if (!active) return null;

              // Look up plan name
              let planName: string | undefined;
              try {
                const plan = active.planId ? await this._planService.findById(active.planId) : null;
                planName = plan?.name ?? undefined;
              } catch {
                planName = undefined;
              }

              return {
                planName,
                expiresAt: active.periodEnd?.toISOString() ?? undefined,
              };
            } catch {
              return null;
            }
          },

          /**
           * Reads all alarms for the current linked account.
           * Returns an array of { productName, currentPrice }.
           */
          alarmProvider: async () => {
            const currentBotCtx = extensions._currentBotCtx as { accountId: string | null } | undefined;
            const accountId = currentBotCtx?.accountId;
            if (!accountId) return [];

            try {
              // Set ALS context so Prisma's tenant filter kicks in
              const alarms = await runWithRequestContext({ tenantId: accountId }, async () => {
                return this._alarmService.getAll();
              });

              return alarms.map(a => ({
                productName: a.name,
                currentPrice: a.threshold?.toString() ?? '—',
              }));
            } catch {
              return [];
            }
          },

          /**
           * Reads profile info (displayName, email) for the current linked user.
           * Returns { displayName, email } or null.
           */
          profileProvider: async () => {
            const currentBotCtx = extensions._currentBotCtx as { userId: string | null } | undefined;
            const userId = currentBotCtx?.userId;
            if (!userId) return null;

            try {
              const user = await this._userRepository.findById(userId);
              if (!user) return null;
              return {
                displayName: user.displayName ?? user.username,
                email: user.email,
              };
            } catch {
              return null;
            }
          },

          /**
           * Graceful degradation for AI-powered conversations.
           * Returns a fixed message when AI is not available.
           */
          aiHandler: async (_body: string, lang: string): Promise<string> => {
            const messages: Record<string, string> = {
              es: 'El asistente de IA no está disponible en este momento. Usa /alarms, /subscription o /profile.',
              en: 'AI assistant is not available right now. Use /alarms, /subscription or /profile.',
            };
            return messages[lang] ?? messages.es;
          },
        };

        const instance = await createBot({ flow: mainFlow, provider: provider!, database: adapter }, { extensions });

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
