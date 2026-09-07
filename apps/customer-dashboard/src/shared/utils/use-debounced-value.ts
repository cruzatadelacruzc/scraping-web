import { useEffect, useState } from 'react';

/**
 * Returns a copy of `value` that only updates once it has stopped changing for
 * `delayMs`. Used to throttle search-as-you-type so filter keystrokes don't fire
 * a network request each.
 *
 * @param value - the fast-changing source value
 * @param delayMs - quiet period before the debounced value catches up (default 300ms)
 * @returns the debounced value
 */
export function useDebouncedValue<TValue>(value: TValue, delayMs = 300): TValue {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
