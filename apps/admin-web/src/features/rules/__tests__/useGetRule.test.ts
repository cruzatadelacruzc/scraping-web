import React from 'react';
import { describe, expect, it, beforeAll, afterEach, afterAll, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { useGetRule } from '../hooks/useGetRule';

const mockRule = {
  rule: {
    id: '1',
    ruleKey: 'brands',
    values: ['apple', 'samsung'],
    version: 1,
    enabled: true,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
};

const server = setupServer();

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useGetRule', () => {
  it('returns mapped rule detail on success', async () => {
    server.use(
      http.get('http://localhost:3000/api/admin/rules/:ruleKey', ({ params }) => {
        expect(params.ruleKey).toBe('brands');
        return HttpResponse.json(mockRule);
      }),
    );

    const { result } = renderHook(() => useGetRule('brands'), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.id).toBe('1');
    expect(result.current.data?.ruleKey).toBe('brands');
    expect(result.current.data?.values).toEqual(['apple', 'samsung']);
    expect(result.current.data?.version).toBe(1);
    expect(result.current.data?.enabled).toBe(true);
    expect(result.current.data?.statusBadge).toEqual({
      label: 'Active',
      variant: 'success',
    });
  });

  it('does not fetch when ruleKey is empty string', () => {
    const fetchSpy = vi.fn();
    server.use(
      http.get('http://localhost:3000/api/admin/rules/:ruleKey', () => {
        fetchSpy();
        return HttpResponse.json(mockRule);
      }),
    );

    const { result } = renderHook(() => useGetRule(''), { wrapper });

    // The query should remain in a disabled state with no data
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();

    // Verify the handler was never called
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
