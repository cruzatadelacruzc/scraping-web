import { type KeyboardEvent, type ReactNode, useCallback, useRef, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: ReactNode;
  /** Accessible description of the tab panel content */
  description?: string;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  /** Called when the active tab changes */
  onChange?: (tabId: string) => void;
  /** Optional class name for the tab list container */
  className?: string;
  /** aria-label for the tablist */
  label: string;
}

/**
 * Minimal accessible tabs component following WAI-ARIA Tabs pattern.
 * Arrow-key navigation: Left/Right to move between tabs.
 * Home/End to jump to first/last tab.
 */
export function Tabs({
  tabs,
  defaultTab,
  onChange,
  className = '',
  label,
}: TabsProps): JSX.Element {
  const [activeTab, setActiveTab] = useState(defaultTab ?? tabs[0].id);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleTabClick = useCallback(
    (tabId: string) => {
      setActiveTab(tabId);
      onChange?.(tabId);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
      let newIndex: number | undefined;

      switch (e.key) {
        case 'ArrowRight':
          newIndex = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          newIndex = (index - 1 + tabs.length) % tabs.length;
          break;
        case 'Home':
          newIndex = 0;
          break;
        case 'End':
          newIndex = tabs.length - 1;
          break;
        default:
          return;
      }

      e.preventDefault();
      const targetTab = tabs[newIndex];
      setActiveTab(targetTab.id);
      onChange?.(targetTab.id);
      tabRefs.current[newIndex]?.focus();
    },
    [tabs, onChange],
  );

  if (tabs.length === 0) {
    return <div />;
  }

  return (
    <div className={className}>
      <div role="tablist" aria-label={label} className="flex border-b border-outline-variant">
        {tabs.map((tab, index) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => {
                handleTabClick(tab.id);
              }}
              onKeyDown={(e) => {
                handleKeyDown(e, index);
              }}
              className={`relative px-4 py-2 text-body-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-void-black ${
                isSelected
                  ? 'text-on-surface after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-primary'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`tabpanel-${tab.id}`}
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== activeTab}
          className="pt-4 focus-visible:outline-none"
          tabIndex={0}
        >
          {tab.id === activeTab && tab.content}
        </div>
      ))}
    </div>
  );
}
