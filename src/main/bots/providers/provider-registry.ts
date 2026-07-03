import { BaileysProvider } from '@builderbot/provider-baileys';
import { TelegramProvider as BuilderbotTelegramProvider } from '@builderbot-plugins/telegram';

/** Descriptor for a single provider implementation. */
export interface IProviderEntry {
  /** The builderbot provider class. */

  Provider: new (...args: any[]) => any;
  /** Builds the configuration object passed to {@code createProvider}. */
  buildConfig(): Record<string, unknown>;
}

/** Top-level registry: botType → providerName → entry. */
const REGISTRY: Record<string, Record<string, IProviderEntry>> = {
  telegram: {
    telegram: {
      Provider: BuilderbotTelegramProvider,
      buildConfig: () => {
        const token = process.env.TELEGRAM_BOT_TOKEN;
        if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set');
        return { token };
      },
    },
  },
  whatsapp: {
    baileys: {
      Provider: BaileysProvider,
      buildConfig: () => ({
        name: process.env.WHATSAPP_SESSION_NAME ?? 'price-monitor-bot',
        // Pairing code has a timing bug in the Baileys provider (calls
        // requestPairingCode before the WebSocket connects). Disabled by
        // default; enable at your own risk via WHATSAPP_USE_PAIRING=true.
        usePairingCode: process.env.WHATSAPP_USE_PAIRING === 'true',
        phoneNumber: process.env.WHATSAPP_PHONE_NUMBER,
      }),
    },
  },
};

/** Default provider keys per bot type. */
const DEFAULTS: Record<string, string> = {
  telegram: 'telegram',
  whatsapp: 'baileys',
};

/**
 * Resolves the provider class and config for a given bot type.
 *
 * The concrete implementation is selected via the {@code BOT_<TYPE>_PROVIDER}
 * env var, falling back to a sensible default.
 *
 * @throws if the provider key is unknown.
 */
export function resolveProviderEntry(botType: string): IProviderEntry {
  const group = REGISTRY[botType];
  if (!group) {
    throw new Error(`Unknown bot type "${botType}". Known: ${Object.keys(REGISTRY).join(', ')}`);
  }

  const envKey = `BOT_${botType.toUpperCase()}_PROVIDER`;
  const providerKey = process.env[envKey] ?? DEFAULTS[botType] ?? Object.keys(group)[0];
  const entry = group[providerKey];

  if (!entry) {
    throw new Error(`Unknown ${envKey}="${providerKey}". Known: ${Object.keys(group).join(', ')}`);
  }

  return entry;
}

/**
 * Returns the list of bot types that should be started, resolved from
 * the {@code BOT_ENABLED} env var.
 */
export function getEnabledBotTypes(): string[] {
  const raw = (process.env.BOT_ENABLED ?? 'none').split(',');
  const types: string[] = [];

  for (const token of raw) {
    const t = token.trim();
    if (t === 'both') {
      if (!types.includes('whatsapp')) types.push('whatsapp');
      if (!types.includes('telegram')) types.push('telegram');
    } else if (t && t !== 'none') {
      if (!types.includes(t)) types.push(t);
    }
  }

  return types;
}
