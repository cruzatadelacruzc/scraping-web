import { create } from 'zustand';

type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  resolvedTheme: ResolvedTheme;
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  initialize: () => void;
}

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: (t: 'light' | 'dark' | 'system') => {
    localStorage.setItem('theme', t);
    const resolved = t === 'system' ? getSystemTheme() : t;
    set({ theme: t, resolvedTheme: resolved });
    applyTheme(resolved);
  },
  initialize: () => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const theme = saved || 'system';
    const resolved = theme === 'system' ? getSystemTheme() : theme;
    set({ theme, resolvedTheme: resolved });
    applyTheme(resolved);
  },
}));