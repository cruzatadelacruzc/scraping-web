/**
 * Unit tests for the bot i18n lang catalog.
 * Asserts that every key used by flows/services is present in BOTH
 * Spanish and English, and that the `t()` helper picks the right language.
 */
import { en } from '@bots/lang/en';
import { es } from '@bots/lang/es';
import { t, SUPPORTED_LANGS, DEFAULT_LANG } from '@bots/lang';

describe('bots/lang', () => {
  describe('catalog parity', () => {
    it('en and es expose the same top-level keys', () => {
      expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    });

    it.each(['welcome', 'unlinked', 'help', 'status', 'errors'])('section %s exists in both languages', section => {
      expect(en[section as keyof typeof en]).toBeDefined();
      expect(es[section as keyof typeof es]).toBeDefined();
    });

    it.each(['common', 'welcome', 'unlinked', 'help', 'status', 'errors'] as const)('section %s has at least one key', section => {
      expect(Object.keys(en[section]).length).toBeGreaterThan(0);
      expect(Object.keys(es[section]).length).toBeGreaterThan(0);
    });
  });

  describe('t()', () => {
    it('returns the Spanish string by default', () => {
      expect(t('es', 'welcome.greeting')).toBe(es.welcome.greeting);
    });

    it('returns the English string for lang="en"', () => {
      expect(t('en', 'welcome.greeting')).toBe(en.welcome.greeting);
    });

    it('falls back to Spanish when the lang is unknown', () => {
      expect(t('fr' as never, 'welcome.greeting')).toBe(es.welcome.greeting);
    });

    it('returns the key itself when the dotted path does not exist', () => {
      expect(t('en', 'welcome.nonexistent' as never)).toBe('welcome.nonexistent');
    });
  });

  describe('module constants', () => {
    it('exports SUPPORTED_LANGS with es and en', () => {
      expect(SUPPORTED_LANGS).toEqual(['es', 'en']);
    });

    it('exports DEFAULT_LANG as es', () => {
      expect(DEFAULT_LANG).toBe('es');
    });
  });
});
