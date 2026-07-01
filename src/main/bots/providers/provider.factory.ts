import { WhatsAppProvider } from '@bots/providers/whatsapp/whatsapp.provider';
import { TelegramProvider } from '@bots/providers/telegram/telegram.provider';

/**
 * Resolves which provider factories should be started based on
 * the `BOT_ENABLED` env var.
 *
 * @returns a list of factory descriptors ready to be consumed by {@link BotService}.
 */
export function getEnabledProviders(
  whatsapp: WhatsAppProvider,
  telegram: TelegramProvider,
): Array<{ name: string; factory: WhatsAppProvider | TelegramProvider }> {
  const enabled = (process.env.BOT_ENABLED ?? 'none').split(',');
  const result: Array<{ name: string; factory: WhatsAppProvider | TelegramProvider }> = [];

  if (enabled.includes('whatsapp') || enabled.includes('both')) {
    result.push({ name: 'whatsapp', factory: whatsapp });
  }
  if (enabled.includes('telegram') || enabled.includes('both')) {
    result.push({ name: 'telegram', factory: telegram });
  }

  return result;
}
