/**
 * Catalog types and lookup helpers for the bot i18n.
 *
 * Both `en.ts` and `es.ts` export the same shape (typed as `Lang`). The
 * `t()` helper resolves a dotted path (e.g. `"welcome.greeting"`) inside the
 * chosen language, falling back to Spanish on unknown langs and to the raw key
 * on missing paths.
 */
import { en } from './en';
import { es } from './es';

export const SUPPORTED_LANGS = ['es', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];
export const DEFAULT_LANG: SupportedLang = 'es';

export type Lang = typeof en;
export type LangKey = string;

const catalogs = { en, es } as unknown as Record<SupportedLang, Lang>;

/**
 * Resolves a dotted path inside the chosen language catalog.
 *
 * @param lang - ISO language code. Unknown values fall back to Spanish.
 * @param path - Dotted path like `"welcome.greeting"`. Missing paths return
 * the path itself (useful for spotting missing translations in tests).
 */
export function t(lang: SupportedLang | string, path: LangKey): string {
  const catalog = catalogs[lang as SupportedLang] ?? catalogs[DEFAULT_LANG];
  const segments = path.split('.');
  let cursor: unknown = catalog;
  for (const segment of segments) {
    if (cursor && typeof cursor === 'object' && segment in (cursor as Record<string, unknown>)) {
      cursor = (cursor as Record<string, unknown>)[segment];
    } else {
      return path;
    }
  }
  return typeof cursor === 'string' ? cursor : path;
}

export { en } from './en';
export { es } from './es';
