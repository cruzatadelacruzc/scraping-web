import { openDB, type IDBPDatabase } from 'idb';
import {
  experimental_createQueryPersister,
  type AsyncStorage,
  type PersistedQuery,
} from '@tanstack/query-persist-client-core';

const DB_NAME = 'bazaarsentinel-cache';
const STORE = 'query-cache';
/** A persisted read cache older than this is discarded on restore. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Opens (once) the cache DB, or resolves `null` where IndexedDB is unavailable
 * — jsdom under tests, private-mode browsers, SSR. Callers then no-op, so the
 * persister silently degrades to "always fetch" instead of throwing.
 */
function db(): Promise<IDBPDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      database.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

/**
 * Real IndexedDB-backed storage — the first actual use of `idb` in the app.
 * Stores the `PersistedQuery` object as-is (IndexedDB structured-clones it, so
 * no JSON round-trip is needed). A no-op when IndexedDB is missing.
 */
export const idbStorage: AsyncStorage<PersistedQuery> = {
  getItem: async (key) => (await db())?.get(STORE, key),
  setItem: async (key, value) => {
    await (await db())?.put(STORE, value, key);
  },
  removeItem: async (key) => {
    await (await db())?.delete(STORE, key);
  },
};

/**
 * Builds a per-query TanStack persister (the `persister` option of `useQuery`).
 * Apply it only to read caches worth surviving a reload while offline — the
 * alarms list/detail and the plan limits. There is no write outbox (spec §7).
 *
 * @param storage - Override the IndexedDB storage (tests inject an in-memory map).
 * @returns The `persisterFn` to pass as `useQuery({ persister })`.
 */
export function createQueryPersister(storage: AsyncStorage<PersistedQuery> = idbStorage) {
  return experimental_createQueryPersister<PersistedQuery>({
    storage,
    maxAge: MAX_AGE_MS,
    serialize: (persistedQuery) => persistedQuery,
    deserialize: (persistedQuery) => persistedQuery,
  }).persisterFn;
}
