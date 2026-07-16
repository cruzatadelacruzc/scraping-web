import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface DropdownMenuItem {
  /** Unique item identifier */
  id: string;
  /** Display label */
  label: string;
  /** Called when the item is activated (click or Enter) */
  onSelect: () => void;
  /** Danger-styled item (appears last in the menu) */
  destructive?: boolean;
  /** Disable the item (e.g. while a mutation is pending) */
  disabled?: boolean;
}

interface DropdownMenuProps {
  /** Button/label for the trigger element */
  triggerLabel: string;
  /** aria-label for the trigger button */
  triggerAriaLabel: string;
  /** Menu items */
  items: DropdownMenuItem[];
  /** Icon component for the trigger (default MoreHorizontal) */
  triggerIcon?: React.ReactNode;
}

/**
 * Minimal accessible dropdown menu.
 *
 * - `menu` role with arrow-key navigation and Esc to close.
 * - Focus trap inside the menu when open.
 * - Items can be `destructive` (styled with danger token, appears last).
 */
export function DropdownMenu({
  triggerLabel,
  triggerAriaLabel,
  items,
  triggerIcon,
}: DropdownMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Sort: non-destructive first, then destructive
  const sortedItems = useMemo(
    () => [...items.filter((i) => !i.destructive), ...items.filter((i) => i.destructive)],
    [items],
  );

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    // Focus first non-disabled item
    const firstEnabled = sortedItems.findIndex((i) => !i.disabled);
    const idx = firstEnabled >= 0 ? firstEnabled : 0;
    // Use setTimeout to ensure the DOM is rendered
    const timer = setTimeout(() => {
      itemRefs.current[idx]?.focus();
    }, 0);
    return () => {
      clearTimeout(timer);
    };
  }, [open, sortedItems]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabledIndices = sortedItems
        .map((item, i) => (item.disabled ? -1 : i))
        .filter((i) => i >= 0);
      const currentEnabledIndex = enabledIndices.indexOf(index);

      let nextIndex: number | undefined;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            nextIndex = enabledIndices[(currentEnabledIndex + 1) % enabledIndices.length];
          }
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (enabledIndices.length > 0) {
            nextIndex =
              enabledIndices[
                (currentEnabledIndex - 1 + enabledIndices.length) % enabledIndices.length
              ];
          }
          break;
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'Home':
          e.preventDefault();
          nextIndex = enabledIndices[0];
          break;
        case 'End':
          e.preventDefault();
          nextIndex = enabledIndices[enabledIndices.length - 1];
          break;
        default:
          return;
      }

      if (nextIndex !== undefined && nextIndex >= 0) {
        itemRefs.current[nextIndex]?.focus();
      }
    },
    [sortedItems, close],
  );

  const handleItemClick = useCallback(
    (item: DropdownMenuItem) => {
      if (item.disabled) return;
      item.onSelect();
      close();
    },
    [close],
  );

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerAriaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className="rounded-sm p-1 text-on-surface-variant transition-colors hover:bg-surface-container-high focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black"
      >
        {triggerIcon ?? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="5" r="1" />
            <circle cx="12" cy="12" r="1" />
            <circle cx="12" cy="19" r="1" />
          </svg>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop for click-outside */}
          <div
            className="fixed inset-0 z-40"
            role="presentation"
            onClick={close}
            onKeyDown={close}
          />

          {/* Menu */}
          <div
            ref={menuRef}
            role="menu"
            aria-label={triggerLabel}
            className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border border-outline-variant bg-surface py-1 shadow-lg"
          >
            {sortedItems.map((item, index) => (
              <button
                key={item.id}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  handleItemClick(item);
                }}
                onKeyDown={(e) => {
                  handleKeyDown(e, index);
                }}
                className={`flex w-full items-center px-3 py-1.5 text-left text-body-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${
                  item.destructive
                    ? 'text-danger hover:bg-danger-muted'
                    : 'text-on-surface hover:bg-surface-container-high'
                } ${item.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
