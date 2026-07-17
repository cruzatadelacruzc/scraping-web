import React from 'react';
import { describe, expect, it, vi, beforeAll, afterEach, afterAll } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { toast } from 'sonner';
import { useCreateRule } from '../hooks/useCreateRule';

const mockCreatedRule = {
  rule: {
    id: '3',
    ruleKey: 'sizes',
    values: ['S', 'M', 'L'],
    version: 1,
    enabled: true,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  },
};

const server = setupServer();

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
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

const createPayload = { ruleKey: 'sizes', values: ['S', 'M', 'L'] };

describe('useCreateRule', () => {
  it('calls POST and shows success toast on 201', async () => {
    server.use(
      http.post('http://localhost:3000/api/admin/rules', () => {
        return HttpResponse.json(mockCreatedRule, { status: 201 });
      }),
    );

    const { result } = renderHook(() => useCreateRule(), { wrapper });

    act(() => {
      result.current.mutate(createPayload);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(toast.success).toHaveBeenCalledWith('Rule created');
  });

  it('shows error toast with retry on failure', async () => {
    server.use(
      http.post('http://localhost:3000/api/admin/rules', () => {
        return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useCreateRule(), { wrapper });

    act(() => {
      result.current.mutate(createPayload);
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    // showRetryToast calls toast.error with the error message and a Retry action
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringMatching(/500|error|fail/i),
      expect.objectContaining({
        duration: Infinity,
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    );
  });
});
