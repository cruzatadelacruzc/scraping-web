import 'reflect-metadata';
import { I18nService } from '@bots/services/i18n.service';
import { DEFAULT_LANG } from '@bots/lang';

describe('I18nService', () => {
  let service: I18nService;
  const log = { debug: jest.fn(), warn: jest.fn(), error: jest.fn(), context: '' } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new I18nService(log);
  });

  describe('resolveLang', () => {
    it('returns the preferredLang from a conversation when valid', () => {
      const lang = service.resolveLang({ preferredLang: 'en' } as any);
      expect(lang).toBe('en');
    });

    it('returns default lang when conversation has no preferredLang', () => {
      const lang = service.resolveLang({} as any);
      expect(lang).toBe(DEFAULT_LANG);
    });

    it('returns default lang when conversation is null/undefined', () => {
      const lang1 = service.resolveLang(null as any);
      const lang2 = service.resolveLang(undefined as any);
      expect(lang1).toBe(DEFAULT_LANG);
      expect(lang2).toBe(DEFAULT_LANG);
    });

    it('falls back to default when preferredLang is unsupported', () => {
      const lang = service.resolveLang({ preferredLang: 'fr' } as any);
      expect(lang).toBe(DEFAULT_LANG);
    });
  });

  describe('t', () => {
    it('resolves a known key in Spanish (default)', () => {
      const result = service.t(DEFAULT_LANG, 'common.greeting');
      expect(result).toBe('¡Hola!');
    });

    it('resolves a known key in English', () => {
      const result = service.t('en', 'common.greeting');
      expect(result).toBe('Hello!');
    });

    it('returns the path itself for unknown keys', () => {
      const result = service.t('es', 'nonexistent.path');
      expect(result).toBe('nonexistent.path');
    });
  });
});
