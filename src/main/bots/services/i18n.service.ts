import { inject, injectable } from 'inversify';
import { ILogger } from '@shared/logger.interface';
import { TYPES } from '@shared/types.container';
import { SUPPORTED_LANGS, DEFAULT_LANG, SupportedLang, t as resolvePath } from '@bots/lang';

@injectable()
export class I18nService {
  public constructor(@inject(TYPES.Logger) private readonly _log: ILogger) {
    this._log.context = I18nService.name;
  }

  /**
   * Resolves the effective language from a BotConversation record.
   * Falls back to the default language when the conversation is null
   * or the stored preference is unsupported.
   */
  public resolveLang(conversation?: { preferredLang?: string } | null): SupportedLang {
    const candidate = conversation?.preferredLang;
    if (candidate && (SUPPORTED_LANGS as readonly string[]).includes(candidate)) {
      return candidate as SupportedLang;
    }
    return DEFAULT_LANG;
  }

  /**
   * Convenience method: resolveLang + t() in one call.
   * For cases where the consumer already knows the language, call `t()` from
   * `@bots/lang` directly instead.
   */
  public t(lang: SupportedLang | string, path: string): string {
    return resolvePath(lang, path);
  }
}
