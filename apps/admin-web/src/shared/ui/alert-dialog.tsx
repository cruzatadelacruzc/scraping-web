import { useCallback, useEffect } from 'react';

interface AlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  isLoading?: boolean;
}

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  destructive = true,
  isLoading = false,
}: AlertDialogProps): JSX.Element | null {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    },
    [onCancel],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/30"
        role="presentation"
        onClick={onCancel}
        onKeyDown={onCancel}
      />

      {/* Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-dialog-title"
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-outline-variant bg-surface p-lg shadow-lg"
      >
        <h2 id="alert-dialog-title" className="text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <p className="mt-sm text-body-sm text-on-surface-variant">{description}</p>
        <div className="mt-lg flex justify-end gap-sm">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="rounded-sm px-sm py-xs text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`rounded-sm px-sm py-xs text-body-sm font-medium text-white transition-colors disabled:opacity-50 ${
              destructive
                ? 'bg-danger hover:bg-danger-hover'
                : 'bg-primary hover:bg-primary-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </>
  );
}
