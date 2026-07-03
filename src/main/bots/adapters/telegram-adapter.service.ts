import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { BotMenuService } from '@bots/services/bot-menu.service';
import type { IProviderAdapter } from './provider-adapter.interface';

/**
 * Telegram-specific adapter.
 *
 * Delegates to {@link BotMenuService} for reply-keyboard and
 * command-menu operations. The service uses the raw Telegraf
 * {@code Telegram} API because builderbot's provider strips
 * {@code reply_markup} from extra options.
 */
@injectable()
export class TelegramAdapter implements IProviderAdapter {
  public constructor(
    @inject(TYPES.Logger) private readonly _log: ILogger,
    @inject(TYPES.BotMenuService) private readonly _menu: BotMenuService,
  ) {
    this._log.context = TelegramAdapter.name;
  }

  /** @inheritdoc */
  public async sendWelcome(chatId: number | string, text: string, linked: boolean): Promise<void> {
    await this._menu.sendWithKeyboard(chatId, text, linked);
  }

  /** @inheritdoc */
  public async applyCommands(chatId: number | string, linked: boolean): Promise<void> {
    await this._menu.applyCommands(chatId, linked);
  }
}
