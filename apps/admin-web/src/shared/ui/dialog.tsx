import { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';

interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Dialog title (sets aria-labelledby) */
  title: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Called when the dialog should close (Esc, backdrop click) */
  onClose: () => void;
  /** Optional max-width class (default max-w-lg) */
  maxWidth?: string;
}

/**
 * Minimal accessible dialog primitive.
 *
 * - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
 * - Esc closes the dialog.
 * - Focus trap: on open, focuses the first focusable element; Tab cycles
 *   through focusable elements inside; Shift+Tab cycles backward.
 * - Restores focus to the trigger element on close.
 * - Backdrop click closes.
 */
export function Dialog({
  open,
  title,
  children,
  onClose,
  maxWidth = 'max-w-lg',
}: DialogProps): JSX.Element | null {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the currently focused element before opening
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus trap: when open, focus the first focusable element
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const focusableSelector =
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const firstFocusable = dialog.querySelector<HTMLElement>(focusableSelector);
      if (firstFocusable) {
        firstFocusable.focus();
      } else {
        dialog.focus();
      }
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [open]);

  // Restore focus on close
  useEffect(() => {
    if (!open && previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      // Focus trap: Tab / Shift+Tab
      if (e.key === 'Tab' && dialogRef.current) {
        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/30" role="presentation" onClick={onClose} />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md border border-outline-variant bg-surface p-lg shadow-lg focus-visible:outline-none"
        style={{ maxWidth }}
      >
        <h2 id="dialog-title" className="text-lg font-semibold text-on-surface">
          {title}
        </h2>
        <div className="mt-md">{children}</div>
      </div>
    </>
  );
}
