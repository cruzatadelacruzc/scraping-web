import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@shared/i18n/i18n', () => ({
  default: { t: (key: string) => key },
}));

vi.mock('../services/users-service', () => ({
  usersService: {
    removeRole: vi.fn(),
  },
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import type { Mock } from 'vitest';
import { toast } from 'sonner';

import { useRemoveRole } from '../hooks/useRemoveRole';
import { usersService } from '../services/users-service';

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

describe('useRemoveRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a success toast when the mutation succeeds', async () => {
    const mockRemove = usersService.removeRole as Mock;
    mockRemove.mockResolvedValueOnce({ data: {} });

    const { result } = renderHook(() => useRemoveRole(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ userId: 'u1', roleId: 'r1' });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('users.removeRoleSuccess');
    });
    expect(mockRemove).toHaveBeenCalledWith('u1', 'r1');
  });

  it('shows sticky error toast on failure and Retry re-fires with same variables', async () => {
    const mockRemove = usersService.removeRole as Mock;
    mockRemove.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce({
      data: {},
    });

    const { result } = renderHook(() => useRemoveRole(), { wrapper: createWrapper() });

    act(() => {
      result.current.mutate({ userId: 'u1', roleId: 'r1' });
    });

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledTimes(1);
    });

    // Sticky toast with a Retry action (rule 6.4: errors never auto-dismiss)
    expect(toast.error).toHaveBeenCalledWith(
      'Server error',
      expect.objectContaining({
        duration: Infinity,
        action: expect.objectContaining({ label: 'Retry' }),
      }),
    );

    // Clicking Retry re-fires the mutation with the same variables
    const toastCall = vi.mocked(toast.error).mock.calls[0] as unknown as [
      string,
      { action: { onClick: () => void } },
    ];
    toastCall[1].action.onClick();

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledTimes(2);
    });
    expect(mockRemove).toHaveBeenLastCalledWith('u1', 'r1');
  });
});
