import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic debounce hook for filter inputs.
 *
 * Manages an instant `value` (for responsive input rendering) and a
 * `debouncedValue` that settles after `delay` ms of inactivity.
 *
 * @param initial - initial value (default `''`)
 * @param delay - debounce delay in ms (default `300`)
 * @returns `{ value, debouncedValue, setValue }`
 *
 * @example
 * const search = useDebouncedFilter('', 300);
 * // <input value={search.value} onChange={e => search.setValue(e.target.value)} />
 * // useGetProducts({ search: search.debouncedValue })
 */
export function useDebouncedFilter(initial = '', delay = 300) {
  const [value, setValue] = useState(initial);
  const [debouncedValue, setDebouncedValue] = useState(initial);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSetValue = useCallback(
    (next: string) => {
      setValue(next);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        setDebouncedValue(next);
      }, delay);
    },
    [delay],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { value, debouncedValue, setValue: handleSetValue };
}
