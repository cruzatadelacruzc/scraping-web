import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface DrawerProps {
  /** Whether the drawer is open */
  open: boolean;
  /** Drawer title (sets aria-labelledby) */
  title: string;
  /** Drawer content */
  children: ReactNode;
  /** Called when the drawer should close (Esc, backdrop click, close button) */
  onClose: () => void;
  /** Optional width class (default w-96) */
  widthClass?: string;
}

/**
 * Global right drawer — reusable slide-in detail panel shared across features.
 *
 * - `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
 * - Esc, backdrop click and the close button all call `onClose`.
 * - Focuses the close button on open and restores focus on close.
 * - Content stays mounted so the slide transition can play; while closed the
 *   panel is `aria-hidden` and `pointer-events-none`.
 */
export function Drawer({
  open,
  title,
  children,
  onClose,
  widthClass = 'w-96',
}: DrawerProps): JSX.Element {
  const { t } = useTranslation();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: close button on open, restore trigger on close
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      closeButtonRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    },
    [onClose],
  );

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30" role="presentation" onClick={onClose} />
      )}

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        aria-hidden={!open}
        onKeyDown={handleKeyDown}
        className={`fixed right-0 top-0 z-50 h-full ${widthClass} transform overflow-y-auto border-l border-outline-variant bg-surface-container-high p-lg shadow-lg transition-transform duration-200 ${
          open ? 'translate-x-0' : 'pointer-events-none translate-x-full'
        }`}
      >
        <div className="mb-lg flex items-center justify-between">
          <h2 id="drawer-title" className="text-lg font-semibold text-on-surface">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-sm p-xs text-on-surface-variant hover:bg-surface-container-highest"
            aria-label={t('common.close', 'Close')}
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </>
  );
}
