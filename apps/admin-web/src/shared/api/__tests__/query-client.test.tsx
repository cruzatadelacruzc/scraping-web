import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import type { NotificationInput } from '@shared/notifications';
import { subscribeToNotifications } from '@shared/notifications';
import { QueryClientProvider, useMutation } from '@tanstack/react-query';

import { createAppQueryClient } from '../query-client';

describe('createAppQueryClient', () => {
  it('applies the standard query defaults', () => {
    const queries = createAppQueryClient().getDefaultOptions().queries;

    expect(queries).toMatchObject({
      staleTime: 30_000,
      retry: 1,
      // The one that changes observable behaviour: no surprise refetch when an
      // admin alt-tabs back to the console. `refetchOnMount` stays at the
      // TanStack default (already deduped) — the real freshness knob is per-tier
      // `staleTime`.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
    });
  });

  it('publishes an error notification when any mutation fails', async () => {
    const received: NotificationInput[] = [];
    const unsubscribe = subscribeToNotifications((n) => {
      received.push(n);
    });

    const queryClient = createAppQueryClient();
    function wrapper({ children }: { children: ReactNode }): JSX.Element {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    }

    const { result } = renderHook(
      () =>
        useMutation({
          mutationFn: () => {
            throw new Error('boom');
          },
        }),
      { wrapper },
    );

    result.current.mutate();

    await waitFor(() => {
      expect(received).toHaveLength(1);
    });
    expect(received[0].severity).toBe('error');
    expect(received[0].description).toBe('boom');

    unsubscribe();
  });
});
