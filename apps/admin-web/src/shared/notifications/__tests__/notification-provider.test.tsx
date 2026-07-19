import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { publishNotification } from '../notification-bus';
import { NotificationProvider } from '../notification-provider';
import { useNotifications } from '../useNotifications';

function wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <NotificationProvider>{children}</NotificationProvider>;
}

describe('NotificationProvider', () => {
  it('notify() prepends an unread notification with defaults', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'First' });
      result.current.notify({ title: 'Second', severity: 'error' });
    });

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0].title).toBe('Second');
    expect(result.current.notifications[0].severity).toBe('error');
    expect(result.current.notifications[1].severity).toBe('info');
    expect(result.current.unreadCount).toBe(2);
  });

  it('markRead() and markAllRead() update unreadCount', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'A' });
      result.current.notify({ title: 'B' });
    });
    const firstId = result.current.notifications[0].id;

    act(() => {
      result.current.markRead(firstId);
    });
    expect(result.current.unreadCount).toBe(1);

    act(() => {
      result.current.markAllRead();
    });
    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications).toHaveLength(2);
  });

  it('clearAll() empties the list', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      result.current.notify({ title: 'A' });
      result.current.clearAll();
    });
    expect(result.current.notifications).toHaveLength(0);
  });

  it('caps the list at 50 notifications', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      for (let i = 0; i < 55; i++) {
        result.current.notify({ title: `n${String(i)}` });
      }
    });
    expect(result.current.notifications).toHaveLength(50);
    expect(result.current.notifications[0].title).toBe('n54');
  });

  it('receives notifications published through the module bus', () => {
    const { result } = renderHook(() => useNotifications(), { wrapper });

    act(() => {
      publishNotification({ title: 'From bus', severity: 'warning' });
    });
    expect(result.current.notifications[0].title).toBe('From bus');
    expect(result.current.notifications[0].severity).toBe('warning');
  });

  it('throws when used outside the provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => renderHook(() => useNotifications())).toThrow(
      'useNotifications must be used within NotificationProvider',
    );
    spy.mockRestore();
  });
});
