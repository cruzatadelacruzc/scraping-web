import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOnlineStatus } from './use-online-status';

// jsdom's navigator.onLine is a fixed `true` and ignores the online/offline
// events, so drive it through an override we control.
let online = true;
const original = Object.getOwnPropertyDescriptor(Navigator.prototype, 'onLine');

beforeAll(() => {
  Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => online });
});
afterAll(() => {
  if (original) Object.defineProperty(Navigator.prototype, 'onLine', original);
});

describe('useOnlineStatus', () => {
  it('reflects navigator.onLine and the window offline/online events', () => {
    online = true;
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      online = false;
      window.dispatchEvent(new Event('offline'));
    });
    expect(result.current).toBe(false);

    act(() => {
      online = true;
      window.dispatchEvent(new Event('online'));
    });
    expect(result.current).toBe(true);
  });
});
