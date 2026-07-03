import { inject, injectable } from 'inversify';
import { Telegram } from 'telegraf';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { t } from '@bots/lang';

/** Bot command definition for Telegram's setMyCommands API. */
interface ITelegramCommand {
  command: string;
  description: string;
}

/** Reply keyboard button definition. */
interface IKeyboardButton {
  text: string;
}

// Button labels are slash-commands — language-neutral, no i18n needed.
const UNAUTHED_BUTTONS: IKeyboardButton[][] = [[{ text: '/help' }, { text: '/status' }], [{ text: '/link' }]];

const AUTHED_BUTTONS: IKeyboardButton[][] = [
  [{ text: '/alarms' }, { text: '/subscription' }],
  [{ text: '/profile' }, { text: '/status' }],
  [{ text: '/help' }, { text: '/unlink' }],
];

/** Builds the command list for a given language and link status. */
function buildCommands(lang: string, linked: boolean): ITelegramCommand[] {
  if (linked) {
    return [
      { command: 'alarms', description: t(lang, 'commands.alarms') },
      { command: 'subscription', description: t(lang, 'commands.subscription') },
      { command: 'profile', description: t(lang, 'commands.profile') },
      { command: 'help', description: t(lang, 'commands.help') },
      { command: 'status', description: t(lang, 'commands.status') },
      { command: 'unlink', description: t(lang, 'commands.unlink') },
    ];
  }
  return [
    { command: 'help', description: t(lang, 'commands.help') },
    { command: 'status', description: t(lang, 'commands.status') },
    { command: 'link', description: t(lang, 'commands.link') },
  ];
}

/** Supported languages for command menus. */
const MENU_LANGS = ['es', 'en'];

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@injectable()
export class BotMenuService {
  private readonly _telegram: Telegram | null = null;

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = BotMenuService.name;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (token) {
      this._telegram = new Telegram(token);
    }
  }

  /**
   * Applies the correct command menu to a specific chat for all supported
   * languages so that Telegram shows the right descriptions per user lang.
   */
  public async applyCommands(chatId: number | string, linked: boolean): Promise<void> {
    if (!this._telegram) {
      this._log.warn('Cannot apply commands — TELEGRAM_BOT_TOKEN not configured');
      return;
    }

    const numericId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;

    try {
      for (const lang of MENU_LANGS) {
        await this._telegram.setMyCommands(buildCommands(lang, linked), {
          scope: { type: 'chat', chat_id: numericId },
          language_code: lang,
        });
      }
      this._log.debug('Commands applied', { chatId, linked });
    } catch (e: unknown) {
      this._log.error(`Failed to apply commands for chatId=${chatId}`, e as Error);
    }
  }

  /** Builds a reply-keyboard markup for the given link status. */
  public buildKeyboard(linked: boolean): { keyboard: IKeyboardButton[][]; resize_keyboard: boolean } {
    return {
      keyboard: linked ? AUTHED_BUTTONS : UNAUTHED_BUTTONS,
      resize_keyboard: true,
    };
  }

  /** Returns the button rows for inline use inside flowDynamic. */
  public getButtons(linked: boolean): IKeyboardButton[][] {
    return linked ? AUTHED_BUTTONS : UNAUTHED_BUTTONS;
  }

  /**
   * Sends a text message with a reply keyboard attached.
   *
   * Uses the raw Telegram API directly because builderbot's provider
   * strips {@code reply_markup} from the extra options (it only forwards
   * inline buttons and media). The {@link Telegram} instance is the same
   * one used for {@link applyCommands}.
   */
  public async sendWithKeyboard(chatId: number | string, text: string, linked: boolean): Promise<void> {
    if (!this._telegram) {
      this._log.warn('Cannot send keyboard — TELEGRAM_BOT_TOKEN not configured');
      return;
    }

    const numericId = typeof chatId === 'string' ? parseInt(chatId, 10) : chatId;
    const keyboard = this.buildKeyboard(linked);

    try {
      await this._telegram.sendMessage(numericId, text, { reply_markup: keyboard });
      this._log.debug('Message with keyboard sent', { chatId: numericId, linked });
    } catch (e: unknown) {
      this._log.error(`Failed to send keyboard for chatId=${chatId}`, e as Error);
    }
  }
}
