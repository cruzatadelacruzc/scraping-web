import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Component under test ───────────────────────────────────────────────────

import { AlertDialog } from '@shared/ui/alert-dialog';

// ── Helpers ────────────────────────────────────────────────────────────────

function renderDialog(overrides: Partial<Parameters<typeof AlertDialog>[0]> = {}) {
  const props = {
    open: true,
    title: 'Confirm action',
    description: 'Are you sure?',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    destructive: false,
    isLoading: false,
    ...overrides,
  };
  return {
    onConfirm: props.onConfirm,
    onCancel: props.onCancel,
    ...render(<AlertDialog {...props} />),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('AlertDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---- Guard during pending ----

  it('does NOT call onCancel on Escape when isLoading is true', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ isLoading: true });

    await user.keyboard('{Escape}');

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('does NOT call onCancel on backdrop click when isLoading is true', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ isLoading: true });

    // The backdrop is the element with role="presentation"
    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel on Escape when isLoading is false', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ isLoading: false });

    await user.keyboard('{Escape}');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel on backdrop click when isLoading is false', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog({ isLoading: false });

    const backdrop = screen.getByRole('presentation');
    await user.click(backdrop);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  // ---- Render ----

  it('renders nothing when open is false', () => {
    const { container } = renderDialog({ open: false });
    expect(container.innerHTML).toBe('');
  });

  it('renders title and description when open is true', () => {
    renderDialog({
      title: 'Delete user?',
      description: 'This cannot be undone.',
    });

    expect(screen.getByText('Delete user?')).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderDialog();

    await user.click(screen.getByText('Confirm'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderDialog();

    await user.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables buttons when isLoading is true', () => {
    renderDialog({ isLoading: true });

    const confirmButton = screen.getByText('Confirm');
    const cancelButton = screen.getByText('Cancel');

    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});
