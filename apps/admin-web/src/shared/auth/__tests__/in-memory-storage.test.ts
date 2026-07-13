import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryStorage } from '../in-memory-storage';

describe('InMemoryStorage', () => {
  let storage: InMemoryStorage;

  beforeEach(() => {
    storage = new InMemoryStorage();
  });

  it('returns null when no access token is set', () => {
    expect(storage.getAccessToken()).toBeNull();
  });

  it('returns null when no refresh token is set', () => {
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('stores and retrieves an access token', () => {
    storage.setAccessToken('my-access-token');
    expect(storage.getAccessToken()).toBe('my-access-token');
  });

  it('stores and retrieves a refresh token', () => {
    storage.setRefreshToken('my-refresh-token');
    expect(storage.getRefreshToken()).toBe('my-refresh-token');
  });

  it('clears all tokens', () => {
    storage.setAccessToken('access');
    storage.setRefreshToken('refresh');
    storage.clear();
    expect(storage.getAccessToken()).toBeNull();
    expect(storage.getRefreshToken()).toBeNull();
  });

  it('overwrites an existing access token', () => {
    storage.setAccessToken('old');
    storage.setAccessToken('new');
    expect(storage.getAccessToken()).toBe('new');
  });
});
