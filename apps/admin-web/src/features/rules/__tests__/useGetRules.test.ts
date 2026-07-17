import React from 'react';
import { describe, expect, it, beforeAll, afterEach, afterAll } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { useGetRules } from '../hooks/useGetRules';

const mockRules = {
  rules: [
    {
      id: '1',
      ruleKey: 'brands',
      values: ['apple', 'samsung'],
      version: 1,
      enabled: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: '2',
      ruleKey: 'colors',
      values: ['red', 'blue'],
      version: 3,
      enabled: false,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ],
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

describe('useGetRules', () => {
  it('returns mapped rules on success', async () => {
    server.use(
      http.get('http://localhost:3000/api/admin/rules', () => {
        return HttpResponse.json(mockRules);
      }),
    );

    const { result } = renderHook(() => useGetRules(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data?.items).toHaveLength(2);
    expect(result.current.data?.total).toBe(2);
  });

  it('maps enabled: true to statusBadge Active/success', async () => {
    server.use(
      http.get('http://localhost:3000/api/admin/rules', () => {
        return HttpResponse.json(mockRules);
      }),
    );

    const { result } = renderHook(() => useGetRules(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const brands = result.current.data?.items.find((item) => item.ruleKey === 'brands');
    expect(brands).toBeDefined();
    expect(brands?.statusBadge).toEqual({
      label: 'Active',
      variant: 'success',
    });
  });

  it('maps enabled: false to statusBadge Inactive/muted', async () => {
    server.use(
      http.get('http://localhost:3000/api/admin/rules', () => {
        return HttpResponse.json(mockRules);
      }),
    );

    const { result } = renderHook(() => useGetRules(), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const colors = result.current.data?.items.find((item) => item.ruleKey === 'colors');
    expect(colors).toBeDefined();
    expect(colors?.statusBadge).toEqual({
      label: 'Inactive',
      variant: 'muted',
    });
  });
});
