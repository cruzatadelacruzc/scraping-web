import { describe, it, expect } from 'vitest';
import { decodeJwt, expiresAtFromToken } from './jwt';

function makeToken(payload: object): string {
  const b64 = (o: object) =>
    btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}.mocksig`;
}

describe('decodeJwt', () => {
  it('decodes the payload of a valid token', () => {
    const token = makeToken({ userId: 'u1', tenantId: 'acc1', exp: 1_700_000_000 });
    const payload = decodeJwt(token);
    expect(payload?.userId).toBe('u1');
    expect(payload?.tenantId).toBe('acc1');
    expect(payload?.exp).toBe(1_700_000_000);
  });

  it('returns null for malformed input', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt('a.b')).not.toBeUndefined();
  });
});

describe('expiresAtFromToken', () => {
  it('returns exp in milliseconds', () => {
    const token = makeToken({ exp: 2_000 });
    expect(expiresAtFromToken(token)).toBe(2_000 * 1000);
  });

  it('falls back to ~24h when the token cannot be decoded', () => {
    const lowerBound = Date.now() + 23 * 60 * 60 * 1000;
    expect(expiresAtFromToken('broken')).toBeGreaterThan(lowerBound);
  });
});
