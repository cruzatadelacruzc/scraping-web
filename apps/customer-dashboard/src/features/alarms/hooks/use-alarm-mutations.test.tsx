import React, { type ReactNode } from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http } from 'msw';
import { server } from '@/mocks/server';
import { fail as failEnvelope } from '@/shared/mocking/handlers/_shared';
import { authService, useAuthStore } from '@/shared/auth';
import { resetAlarmsStore } from '@/shared/mocking/handlers/alarms-handlers';
import { alarmsService } from '../services/alarms-service';
import { useAlarms } from './use-alarms';
import { useToggleAlarm } from './use-alarm-mutations';

beforeAll(async () => {
  const session = await authService.login('demo@bazaarsentinel.app', 'Demo1234');
  useAuthStore.getState().setSession(session);
});

beforeEach(() => resetAlarmsStore());

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, { client }, children);
  };
}

describe('useToggleAlarm (optimistic)', () => {
  it('flips enabled immediately and keeps it on success', async () => {
    const created = await alarmsService.create({
      productUrl: 'https://r/x',
      name: 'T',
      condition: 'PRICE_DROPS_BELOW',
      threshold: 1,
    });
    const { result } = renderHook(() => ({ list: useAlarms(), toggle: useToggleAlarm() }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));

    act(() => result.current.toggle.mutate({ id: created.id, enabled: false }));
    // Optimistic: applied before server response
    expect(result.current.list.data?.[0].enabled).toBe(false);
    await waitFor(() => expect(result.current.toggle.isPending).toBe(false));
    expect(result.current.list.data?.[0].enabled).toBe(false);
  });

  it('rolls back on server error', async () => {
    const created = await alarmsService.create({
      productUrl: 'https://r/x',
      name: 'T',
      condition: 'PRICE_DROPS_BELOW',
      threshold: 1,
    });
    server.use(http.put(`/api/alarms/${created.id}`, () => failEnvelope('boom', 500)));

    const { result } = renderHook(() => ({ list: useAlarms(), toggle: useToggleAlarm() }), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));

    act(() => result.current.toggle.mutate({ id: created.id, enabled: false }));
    await waitFor(() => expect(result.current.toggle.isError).toBe(true));
    expect(result.current.list.data?.[0].enabled).toBe(true); // rolled back
  });
});
