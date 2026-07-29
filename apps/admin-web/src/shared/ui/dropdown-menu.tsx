import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface DropdownMenuItem {
  id: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

interface DropdownMenuProps {
  triggerLabel: string;
  triggerAriaLabel: string;
  items: DropdownMenuItem[];
  triggerIcon?: React.ReactNode;
}

/**
 * Accessible dropdown menu rendered in a portal to escape scroll containers.
 *
 * - Menu is rendered into document.body via createPortal so it never gets
 *   clipped by parent overflow:hidden/auto containers.
 * - Position is calculated from the trigger's viewport coordinates on open.
 * - Arrow-key navigation, Esc to close, click-outside to close.
 */
export function DropdownMenu({
  triggerLabel,
  triggerAriaLabel,
  items,
  triggerIcon,
}: DropdownMenuProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const sortedItems = useMemo(
    () => [...items.filter((i) => !i.destructive), ...items.filter((i) => i.destructive)],
    [items],
  );

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  const handleToggle = useCallback(() => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 4, left: rect.right - 160 });
    }
    setOpen((prev) => !prev);
  }, [open]);

  // Click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, [open, close]);

  // Focus first enabled item on open
  useEffect(() => {
    if (!open) return;
    const firstEnabled = sortedItems.findIndex((i) => !i.disabled);
    const idx = firstEnabled >= 0 ? firstEnabled : 0;
    const timer = setTimeout(() => itemRefs.current[idx]?.focus(), 0);
    return () => {
      clearTimeout(timer);
    };
  }, [open, sortedItems]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      const enabledIndices = sortedItems
        .map((item, i) => (item.disabled ? -1 : i))
        .filter((i) => i >= 0);
      const pos = enabledIndices.indexOf(index);
      let next: number | undefined;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          next = enabledIndices[(pos + 1) % enabledIndices.length];
          break;
        case 'ArrowUp':
          e.preventDefault();
          next = enabledIndices[(pos - 1 + enabledIndices.length) % enabledIndices.length];
          break;
        case 'Escape':
          e.preventDefault();
          close();
          return;
        case 'Home':
          e.preventDefault();
          next = enabledIndices[0];
          break;
        case 'End':
          e.preventDefault();
          next = enabledIndices[enabledIndices.length - 1];
          break;
        default:
          return;
      }
      if (next >= 0) itemRefs.current[next]?.focus();
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

  const menu = open && (
    <>
      {/* Invisible backdrop for click-outside */}
      <div className="fixed inset-0 z-40" role="presentation" onClick={close} />
      {/* Menu rendered in portal at viewport coordinates */}
      <div
        ref={menuRef}
        role="menu"
        aria-label={triggerLabel}
        className="fixed z-50 min-w-[160px] rounded-md border border-outline-variant bg-surface py-1 shadow-lg"
        style={{ top: `${String(menuPos.top)}px`, left: `${String(menuPos.left)}px` }}
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
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={triggerAriaLabel}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={handleToggle}
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
      {menu && createPortal(menu, document.body)}
    </>
  );
}
