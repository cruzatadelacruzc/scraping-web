import { useSyncExternalStore } from 'react';

function subscribe(callback: () => void): () => void {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

/** Reactive `navigator.onLine` — re-renders on the window online/offline events. */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true
  );
}
