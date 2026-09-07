import React, { type ReactNode } from 'react';
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authService, useAuthStore } from '@/shared/auth';
import { resetAlarmsStore } from '@/shared/mocking/handlers/alarms-handlers';
import { alarmsService } from '../services/alarms-service';
import { usePlanLimits } from './use-plan-limits';

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

describe('usePlanLimits', () => {
  it('combines plan features with the current alarm count', async () => {
    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.maxAlarms).toBe(3);
    expect(result.current.used).toBe(0);
    expect(result.current.atLimit).toBe(false);
    expect(result.current.allowedConditions).toEqual([
      'PRICE_DROPS_BELOW',
      'PRICE_RISES_ABOVE',
      'PRICE_CHANGES_BY_PERCENT',
    ]);
  });

  it('reports atLimit when used reaches maxAlarms', async () => {
    for (let i = 0; i < 3; i++) {
      await alarmsService.create({
        productUrl: 'https://r/x',
        name: `a${i}`,
        condition: 'PRICE_DROPS_BELOW',
        threshold: 1,
      });
    }
    const { result } = renderHook(() => usePlanLimits(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.used).toBe(3));
    expect(result.current.atLimit).toBe(true);
  });
});
