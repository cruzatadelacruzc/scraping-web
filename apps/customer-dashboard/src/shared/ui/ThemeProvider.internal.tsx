import React, { useEffect } from 'react';
import { useThemeStore } from './theme-store';

type ResolvedTheme = 'light' | 'dark';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.setAttribute('data-theme', theme);
}

export const ThemeProvider: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { initialize } = useThemeStore();

  useEffect(() => {
    initialize();
    const { theme } = useThemeStore.getState();
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => {
        useThemeStore.setState({ resolvedTheme: getSystemTheme() });
        applyTheme(getSystemTheme());
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [initialize]);

  return <>{children}</>;
};
