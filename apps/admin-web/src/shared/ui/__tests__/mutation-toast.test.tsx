import { describe, expect, it, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Imports after mocks ────────────────────────────────────────────────────

import { toast } from 'sonner';

import { showRetryToast } from '../mutation-toast';

// ── Tests ──────────────────────────────────────────────────────────────────

describe('showRetryToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
