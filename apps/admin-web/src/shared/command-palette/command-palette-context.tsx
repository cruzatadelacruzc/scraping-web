import {
  createContext,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface CommandPaletteContextValue {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Owns the palette open state and the global ⌘K / Ctrl+K hotkey. */
export function CommandPaletteProvider({ children }: { children: ReactNode }): JSX.Element {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: globalThis.KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return <CommandPaletteContext.Provider value={value}>{children}</CommandPaletteContext.Provider>;
}

/**
 * Access the command palette open state.
 * @returns Context value with the open flag and its setter.
 * @throws Error when rendered outside a CommandPaletteProvider.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useCommandPalette(): CommandPaletteContextValue {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) {
    throw new Error('useCommandPalette must be used within CommandPaletteProvider');
  }
  return ctx;
}
