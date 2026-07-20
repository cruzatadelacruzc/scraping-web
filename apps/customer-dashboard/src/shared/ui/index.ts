import { useThemeStore } from './theme-store';

export const useTheme = () => {
  const { theme, resolvedTheme, setTheme } = useThemeStore();
  return { theme, resolvedTheme, setTheme };
};

export { ThemeProvider } from './ThemeProvider.internal';