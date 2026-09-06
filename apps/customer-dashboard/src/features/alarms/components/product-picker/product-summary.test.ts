import { describe, it, expect } from 'vitest';
import { formatProductPrice, formatProductLocation } from './product-summary';

describe('formatProductPrice', () => {
  it('groups thousands and appends the currency', () => {
    expect(formatProductPrice({ price: 1234, currency: 'USD' })).toBe('1,234 USD');
    expect(formatProductPrice({ price: 25, currency: 'CUP' })).toBe('25 CUP');
  });

  it('falls back to 0 for a non-finite price', () => {
    expect(formatProductPrice({ price: Number.NaN, currency: 'USD' })).toBe('0 USD');
  });
});

describe('formatProductLocation', () => {
  it('joins municipality and state', () => {
    expect(
      formatProductLocation({ location: { municipality: 'Centro Habana', state: 'La Habana' } })
    ).toBe('Centro Habana, La Habana');
  });

  it('uses whichever part is present', () => {
    expect(formatProductLocation({ location: { state: 'Matanzas' } })).toBe('Matanzas');
    expect(formatProductLocation({ location: { municipality: 'Vedado' } })).toBe('Vedado');
  });

  it('returns an empty string when no location is known', () => {
    expect(formatProductLocation({ location: undefined })).toBe('');
    expect(formatProductLocation({ location: { state: '  ' } })).toBe('');
  });
});
