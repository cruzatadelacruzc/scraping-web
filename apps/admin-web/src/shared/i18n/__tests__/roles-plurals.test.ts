import { describe, expect, it, beforeAll } from 'vitest';
import { createInstance, type i18n as I18nInstance } from 'i18next';

import en from '../locales/en.json';
import es from '../locales/es.json';

// A clean i18next instance over the real locale files — no LanguageDetector,
// no react bindings — so plural resolution is tested against production JSON.
let i18n: I18nInstance;

beforeAll(async () => {
  i18n = createInstance();
  await i18n.init({
    resources: { en: { translation: en }, es: { translation: es } },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
});

describe('roles.userCount pluralization', () => {
  it('uses the singular form for count 1 in English', () => {
    expect(i18n.t('roles.userCount', { count: 1, lng: 'en' })).toBe('1 user');
  });

  it('uses the plural form for other counts in English', () => {
    expect(i18n.t('roles.userCount', { count: 0, lng: 'en' })).toBe('0 users');
    expect(i18n.t('roles.userCount', { count: 5, lng: 'en' })).toBe('5 users');
  });

  it('uses the singular form for count 1 in Spanish', () => {
    expect(i18n.t('roles.userCount', { count: 1, lng: 'es' })).toBe('1 usuario');
  });

  it('uses the plural form for other counts in Spanish', () => {
    expect(i18n.t('roles.userCount', { count: 0, lng: 'es' })).toBe('0 usuarios');
    expect(i18n.t('roles.userCount', { count: 5, lng: 'es' })).toBe('5 usuarios');
  });
});
