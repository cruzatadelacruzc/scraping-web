import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import type { IProviderAdapter } from './provider-adapter.interface';

/**
 * WhatsApp-specific adapter.
 *
 * Baileys does not support reply keyboards or native command menus.
 * This adapter sends the welcome message as plain text with slash-commands
 * listed inline. When WhatsApp Cloud API becomes available, interactive
 * buttons can be added here without touching any flow.
 */
@injectable()
export class WhatsAppAdapter implements IProviderAdapter {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = WhatsAppAdapter.name;
  }

  /** @inheritdoc */
  public async sendWelcome(chatId: number | string, text: string, linked: boolean): Promise<void> {
    // WhatsApp no tiene reply keyboard. El provider envía texto plano que ya
    // incluye los comandos en el mensaje de bienvenida. Si a futuro se activan
    // listas interactivas o template buttons, se implementan aquí.
    this._log.debug('WhatsApp welcome (text-only)', { chatId, linked });
  }

  /** @inheritdoc */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async applyCommands(chatId: number | string, linked: boolean): Promise<void> {
    // WhatsApp no tiene concepto de menú de comandos nativo.
    // No-op: los comandos se documentan en el texto de bienvenida.
  }
}
