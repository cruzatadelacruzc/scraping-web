import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../services/schedules-service', () => ({
  schedulesService: {
    create: vi.fn(),
  },
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import type { Mock } from 'vitest';
import { toast } from 'sonner';

import { showRetryToast } from '../hooks/mutation-toast';
import { useCreateSchedule } from '../hooks/useCreateSchedule';
import { schedulesService } from '../services/schedules-service';

// ── Helpers ────────────────────────────────────────────────────────────────

import { renderHook, act, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('mutation-toast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('showRetryToast', () => {
    it('shows a sticky error toast with Retry action', () => {
      const retryFn = vi.fn();
      showRetryToast(new Error('Something went wrong'), retryFn);

      expect(toast.error).toHaveBeenCalledWith('Something went wrong', {
        duration: Infinity,
        action: {
          label: 'Retry',
          onClick: retryFn,
        },
      });
    });

    it('calls the retry callback when Retry is clicked', () => {
      const retryFn = vi.fn();
      showRetryToast(new Error('Fail'), retryFn);

      const call = vi.mocked(toast.error).mock.calls[0] as unknown as [
        string,
        { action: { onClick: () => void } },
      ];
      const onClick = call[1].action.onClick;
      onClick();

      expect(retryFn).toHaveBeenCalledOnce();
    });
  });

  describe('useCreateSchedule retry integration', () => {
    it('shows sticky error toast when mutation fails and Retry re-fires with same variables', async () => {
      const mockCreate = schedulesService.create as Mock;
      // First call fails, second succeeds
      mockCreate.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce({
        data: {
          schedule: {
            id: 's1',
            name: 'test-schedule',
            store: 'revolico',
            cron: '0 * * * *',
            enabled: true,
            jobs: [],
            lastRunAt: null,
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      });

      const { result } = renderHook(() => useCreateSchedule(), {
        wrapper: createWrapper(),
      });

      const payload = {
        name: 'test-schedule',
        store: 'revolico',
        cron: '0 * * * *',
        jobs: [],
      };

      // Fire the mutation
      act(() => {
        result.current.mutate(payload);
      });

      // Wait for the error state
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(1);
      });

      // Assert toast was called with sticky + Retry
      expect(toast.error).toHaveBeenCalledWith(
        'Server error',
        expect.objectContaining({
          duration: Infinity,
          action: expect.objectContaining({ label: 'Retry' }),
        }),
      );

      // Simulate clicking Retry
      const toastCall = vi.mocked(toast.error).mock.calls[0] as unknown as [
        string,
        { action: { onClick: () => void } },
      ];
      const retryFn = toastCall[1].action.onClick;
      retryFn();

      // Wait for the mutation to re-fire
      await waitFor(() => {
        expect(mockCreate).toHaveBeenCalledTimes(2);
      });

      // Assert it was called with the same variables
      expect(mockCreate).toHaveBeenLastCalledWith(payload);
    });
  });
});
