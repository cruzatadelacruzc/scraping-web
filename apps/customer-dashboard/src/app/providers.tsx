import React from 'react';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
// Side-effect import: initializes the default i18next instance (used by
// useTranslation app-wide). No <I18nextProvider> needed for a single instance.
import '@shared/i18n';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <ThemeProvider />
      {children}
    </>
  );
};
