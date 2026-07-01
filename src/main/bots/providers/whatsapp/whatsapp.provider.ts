import { inject, injectable } from 'inversify';
import { createProvider, ProviderClass } from '@builderbot/bot';
import { BaileysProvider } from '@builderbot/provider-baileys';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';

/**
 * Factory that creates a builderbot WhatsApp {@link ProviderClass}
 * wired to Baileys (WhatsApp Web).
 *
 * The instance is passed to {@link createBot} — builderbot handles
 * QR-code auth, message reception, flow dispatching, and response
 * delivery natively.
 */
@injectable()
export class WhatsAppProvider {
  public readonly name = 'whatsapp';

  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = WhatsAppProvider.name;
  }

  /**
   * Creates a builderbot {@link ProviderClass} for WhatsApp (Baileys).
   *
   * @returns a provider ready to be passed to {@link createBot}.
   */
  public createProviderInstance(): ProviderClass {
    const sessionName = process.env.WHATSAPP_SESSION_NAME ?? 'price-monitor-bot';

    this._log.info('Creating WhatsApp provider instance', { sessionName });

    return createProvider(BaileysProvider, { name: sessionName });
  }
}
