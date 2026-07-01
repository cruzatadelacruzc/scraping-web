import type { ProviderClass } from '@builderbot/bot';

/**
 * Protocol that every bot-provider factory must implement.
 *
 * Each factory wraps a builderbot provider (Baileys for WhatsApp,
 * {@link https://www.npmjs.com/package/@builderbot-plugins/telegram @builderbot-plugins/telegram}
 * for Telegram) and exposes it as a {@link ProviderClass} so
 * {@link BotService} can pass it to {@link createBot}.
 */
export interface IBotProvider {
  /** Human-readable name for logging ("whatsapp", "telegram"). */
  readonly name: string;

  /**
   * Creates a builderbot {@link ProviderClass} ready to be passed
   * to {@link createBot}. The provider is NOT started here —
   * builderbot calls `start()` internally.
   */
  createProviderInstance(): ProviderClass;
}
