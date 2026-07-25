import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * All available alarm condition types, derived from the Prisma AlarmConditionType
 * enum. Reusable by other features that need the canonical list.
 */
// eslint-disable-next-line react-refresh/only-export-components -- ALL_CONDITIONS is intentionally co-located with the component for Task 2 reuse
export const ALL_CONDITIONS = [
  'PRICE_DROPS_BELOW',
  'PRICE_RISES_ABOVE',
  'PRICE_CHANGES_BY_PERCENT',
  'VIEWS_EXCEED',
  'IS_OUTSTANDING',
  'SELLER_CHANGED',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a UPPER_SNAKE_CASE condition key into a human-readable label.
 *
 * @example formatConditionLabel('PRICE_DROPS_BELOW') // 'Price Drops Below'
 */
function formatConditionLabel(condition: string): string {
  return condition
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConditionMultiSelectProps {
  /** The full list of condition options to display. */
  options: readonly string[];
  /** Currently selected condition values. */
  value: string[];
  /** Called when selection changes. Receives the full updated array. */
  onChange: (selected: string[]) => void;
  /** Placeholder text shown when nothing is selected. */
  placeholder?: string;
  /** Disables all interaction. */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * A controlled multi-select component for choosing alarm conditions.
 *
 * Features a dropdown popover with search filtering, "Select all" / "Clear all"
 * shortcuts, and removable chips for each selected item.
 *
 * Uses a plain div with absolute positioning for the popover (no @radix-ui
 * dependency) and a `mousedown` listener for click-outside detection.
 *
 * @example
 * ```tsx
 * const [selected, setSelected] = useState<string[]>([]);
 *
 * <ConditionMultiSelect
 *   options={ALL_CONDITIONS}
 *   value={selected}
 *   onChange={setSelected}
 *   placeholder="Choose conditions"
 * />
 * ```
 */
export function ConditionMultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select conditions',
  disabled = false,
}: ConditionMultiSelectProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter options by search query (case-insensitive label match)
  const filteredOptions = useMemo(
    () =>
      searchQuery
        ? options.filter((opt) =>
            formatConditionLabel(opt).toLowerCase().includes(searchQuery.toLowerCase()),
          )
        : options,
    [options, searchQuery],
  );

  const hasSelection = value.length > 0;
  const allSelected = value.length === options.length;
  const anySelectable = options.length > 0;

  // Close popover on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Toggle a single condition in the selection
  const handleToggle = useCallback(
    (condition: string) => {
      const updated = value.includes(condition)
        ? value.filter((c) => c !== condition)
        : [...value, condition];
      onChange(updated);
    },
    [value, onChange],
  );

  // Select every option
  const handleSelectAll = useCallback(() => {
    onChange([...options]);
  }, [options, onChange]);

  // Deselect every option
  const handleClearAll = useCallback(() => {
    onChange([]);
  }, [onChange]);

  // Remove a single condition (from chip X button)
  const handleRemove = useCallback(
    (condition: string) => {
      onChange(value.filter((c) => c !== condition));
    },
    [value, onChange],
  );

  // Toggle popover open/close
  const handleTriggerClick = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger button ── */}
      <button
        type="button"
        onClick={handleTriggerClick}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="w-full rounded-sm border border-outline-variant bg-surface px-sm py-xs text-body-sm text-left text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      >
        {hasSelection ? `${String(value.length)} selected` : placeholder}
      </button>

      {/* ── Selected chips ── */}
      {hasSelection && (
        <div className="mt-xs flex flex-wrap gap-1" aria-label="Selected conditions">
          {value.map((condition) => (
            <span
              key={condition}
              className="inline-flex items-center gap-1 rounded-sm bg-surface-container-high px-1.5 py-0.5 text-body-xs text-on-surface-variant"
            >
              {formatConditionLabel(condition)}
              <button
                type="button"
                onClick={() => {
                  handleRemove(condition);
                }}
                className="inline-flex items-center text-on-surface-variant hover:text-on-surface focus:outline-none"
                aria-label={`Remove ${formatConditionLabel(condition)}`}
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* ── Popover ── */}
      {isOpen && (
        <div
          className="absolute left-0 z-50 mt-1 w-full min-w-[200px] rounded-md border border-outline-variant bg-surface p-sm shadow-lg"
          role="listbox"
          aria-multiselectable="true"
          aria-label="Available conditions"
        >
          {/* Search input */}
          <div className="relative mb-xs">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
              aria-hidden="true"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              placeholder="Search conditions..."
              className="w-full rounded-sm border border-outline-variant bg-surface py-1.5 pl-7 pr-2 text-body-sm text-on-surface placeholder:text-on-surface-variant focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="Search conditions"
            />
          </div>

          {/* "Select all" / "Clear all" */}
          {anySelectable && (
            <div className="mb-xs flex items-center justify-between border-b border-outline-variant pb-xs">
              <button
                type="button"
                onClick={handleSelectAll}
                disabled={allSelected}
                className="text-body-xs text-primary transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                disabled={!hasSelection}
                className="text-body-xs text-on-surface-variant transition-opacity hover:opacity-80 disabled:opacity-40"
              >
                Clear all
              </button>
            </div>
          )}

          {/* Options list */}
          {filteredOptions.length === 0 ? (
            <p className="py-sm text-center text-body-xs text-on-surface-variant">
              No conditions found
            </p>
          ) : (
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.map((option) => (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
                  role="option"
                  aria-selected={value.includes(option)}
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option)}
                    onChange={() => {
                      handleToggle(option);
                    }}
                    className="rounded-sm border-outline-variant text-primary focus:ring-2 focus:ring-primary"
                  />
                  {formatConditionLabel(option)}
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
