import { inject, injectable } from 'inversify';
import { createProvider, ProviderClass } from '@builderbot/bot';
import { TelegramProvider as BuilderbotTelegramProvider } from '@builderbot-plugins/telegram';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

/**
 * Factory that creates a builderbot Telegram {@link ProviderClass}
 * wired to the real Telegram Bot API via {@link BuilderbotTelegramProvider}.
 *
 * The instance is passed to {@link createBot} — builderbot handles
 * message reception, flow dispatching, and response delivery natively.
 */
@injectable()
export class TelegramProvider {
  public readonly name = 'telegram';

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = TelegramProvider.name;
  }

  /**
   * Creates a builderbot {@link ProviderClass} for Telegram.
   *
   * @returns a provider ready to be passed to {@link createBot}.
   * @throws if `TELEGRAM_BOT_TOKEN` env var is not set.
   */
  public createProviderInstance(): ProviderClass {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set — cannot start Telegram provider');
    }

    this._log.info('Creating Telegram provider instance');

    return createProvider(BuilderbotTelegramProvider, { token });
  }
}
