import React from 'react';
import { ThemeProvider } from '@shared/ui/ThemeProvider';

export const Providers: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <ThemeProvider />
      {children}
    </>
  );
};