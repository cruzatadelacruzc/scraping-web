import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

import { usePaginatedQuery } from '../usePaginatedQuery';

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

function createWrapper(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return React.createElement(QueryClientProvider, {
      client: queryClient,
      children,
    });
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('usePaginatedQuery', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('refetches when page changes (query key includes pagination params)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ items: [], total: 0 });

    const { rerender } = renderHook(
      ({ page }: { page: number }) =>
        usePaginatedQuery({
          page,
          limit: 20,
          filters: { search: '' },
          queryKeyBase: 'test',
          queryFn,
          staleTime: 300_000,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { page: 1 },
      },
    );

    // First fetch for page 1 → skip: 0
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
    expect(queryFn).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, limit: 20 }));

    // Switch to page 2
    rerender({ page: 2 });

    // FAILS with the buggy key (page/limit omitted) because the cache entry
    // is still fresh → no refetch. PASSES after the fix adds pagination to
    // the query key → new cache entry → new fetch with skip: 20.
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
    expect(queryFn).toHaveBeenLastCalledWith(expect.objectContaining({ skip: 20, limit: 20 }));
  });

  it('does not refetch when params are identical (stable key)', async () => {
    const queryFn = vi.fn().mockResolvedValue({ items: [], total: 0 });

    const { rerender } = renderHook(
      ({ page }: { page: number }) =>
        usePaginatedQuery({
          page,
          limit: 20,
          filters: { search: 'foo' },
          queryKeyBase: 'test',
          queryFn,
          staleTime: 300_000,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { page: 1 },
      },
    );

    // First fetch happens
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    // Re-render with same props — key unchanged, data still fresh → no refetch
    rerender({ page: 1 });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  it('does not refetch on remount while the cached page is still fresh', async () => {
    const queryFn = vi.fn().mockResolvedValue({ items: [], total: 0 });
    const sharedClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const params = {
      page: 1,
      limit: 20,
      filters: { search: 'foo' },
      queryKeyBase: 'test-remount',
      queryFn,
      staleTime: 300_000,
    };

    const first = renderHook(() => usePaginatedQuery(params), {
      wrapper: createWrapper(sharedClient),
    });
    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
    first.unmount();

    // A fresh mount of the same query (e.g. navigating away and back). The page
    // is still within staleTime, so no network call — this must hold whether or
    // not `refetchOnMount` is set on the hook.
    renderHook(() => usePaginatedQuery(params), { wrapper: createWrapper(sharedClient) });

    await new Promise((r) => setTimeout(r, 20));
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('keeps previous data while fetching next page with placeholderData opt-in', async () => {
    const firstResult = { items: ['a'], total: 2 } as const;
    const secondResult = { items: ['b'], total: 2 } as const;

    let resolveSecond!: (value: typeof secondResult) => void;
    const secondPromise = new Promise<typeof secondResult>((resolve) => {
      resolveSecond = resolve;
    });

    const queryFn = vi.fn().mockResolvedValueOnce(firstResult).mockReturnValueOnce(secondPromise);

    const { rerender, result } = renderHook(
      ({ page }: { page: number }) =>
        usePaginatedQuery({
          page,
          limit: 20,
          filters: { search: '' },
          queryKeyBase: 'test-ph',
          queryFn,
          staleTime: 0,
          placeholderData: true,
        }),
      {
        wrapper: createWrapper(),
        initialProps: { page: 1 },
      },
    );

    // Page 1 resolves immediately
    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
    expect(result.current.data).toEqual(firstResult);
    expect(result.current.isPlaceholderData).toBe(false);

    // Switch to page 2 — second fetch is pending
    rerender({ page: 2 });

    // While the new fetch is in-flight, placeholderData keeps the old result
    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(true);
    });
    expect(result.current.data).toEqual(firstResult);

    // Resolve the pending fetch
    resolveSecond(secondResult);

    // Now we have page 2 data
    await waitFor(() => {
      expect(result.current.data).toEqual(secondResult);
      expect(result.current.isPlaceholderData).toBe(false);
    });
  });
});
