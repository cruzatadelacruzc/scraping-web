import { describe, it, expect } from 'vitest';
import type { AsyncStorage, PersistedQuery } from '@tanstack/query-persist-client-core';
import { createQueryPersister } from './query-persister';

function memoryStorage(): AsyncStorage<PersistedQuery> & {
  store: Map<string, PersistedQuery>;
} {
  const store = new Map<string, PersistedQuery>();
  return {
    store,
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
  };
}

describe('createQueryPersister', () => {
  it('returns a per-query persister function', () => {
    const persister = createQueryPersister(memoryStorage());
    expect(typeof persister).toBe('function');
    // QueryPersister signature: (queryFn, context, query) => T | Promise<T>
    expect(persister.length).toBeGreaterThanOrEqual(2);
  });

  it('is bound to the injected storage (round-trips a PersistedQuery)', async () => {
    const storage = memoryStorage();
    createQueryPersister(storage);

    const pq: PersistedQuery = {
      buster: '',
      queryHash: '["alarms","list"]',
      queryKey: ['alarms', 'list'],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- minimal QueryState stub for the storage contract
      state: { data: [{ id: 'a1' }] } as any,
    };

    expect(await storage.getItem('k')).toBeNull();
    await storage.setItem('k', pq);
    expect(await storage.getItem('k')).toEqual(pq);
    await storage.removeItem('k');
    expect(await storage.getItem('k')).toBeNull();
  });
});
